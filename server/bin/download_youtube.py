#!/usr/bin/env python3
import sys
import os
import subprocess
import urllib.request
import random
import concurrent.futures
import time

def fetch_proxies():
    proxies = []
    
    # 1. Fetch HTTP proxies
    try:
        req = urllib.request.Request(
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            content = response.read().decode('utf-8')
            for line in content.splitlines():
                line = line.strip()
                if line:
                    proxies.append(("http", line))
    except Exception as e:
        print(f"[Veyra Downloader] Warning: Failed to fetch HTTP proxies: {e}", file=sys.stderr)

    # 2. Fetch SOCKS5 proxies
    try:
        req = urllib.request.Request(
            "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            content = response.read().decode('utf-8')
            for line in content.splitlines():
                line = line.strip()
                if line:
                    proxies.append(("socks5", line))
    except Exception as e:
        print(f"[Veyra Downloader] Warning: Failed to fetch SOCKS5 proxies: {e}", file=sys.stderr)

    random.shuffle(proxies)
    return proxies

def download_worker(proxy_info, url, temp_template, base_output, success_flag_file):
    proto, ip_port = proxy_info
    proxy_url = f"{proto}://{ip_port}"
    
    # Check if another thread already succeeded
    if os.path.exists(success_flag_file):
        return None

    # Thread-specific unique output file template to avoid collisions
    thread_id = random.randint(100000, 999999)
    thread_output_template = f"{base_output}_{thread_id}.%(ext)s"
    thread_final_mp3 = f"{base_output}_{thread_id}.mp3"

    cmd = [
        "python3", "server/bin/yt-dlp",
        "--proxy", proxy_url,
        "--socket-timeout", "3",
        "--retries", "0",
        "--fragment-retries", "0",
        "--extractor-retries", "0",
        "-f", "ba",
        "-x", "--audio-format", "mp3",
        "--ffmpeg-location", "/usr/bin/ffmpeg",
        "-o", thread_output_template,
        url
    ]
    
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
        if proc.returncode == 0 and os.path.exists(thread_final_mp3):
            # Double check if we are the first to succeed
            if not os.path.exists(success_flag_file):
                # Write flag file and rename to target output path
                with open(success_flag_file, "w") as f:
                    f.write(proxy_url)
                if os.path.exists(base_output + ".mp3"):
                    try:
                        os.remove(base_output + ".mp3")
                    except Exception:
                        pass
                os.rename(thread_final_mp3, base_output + ".mp3")
                return proxy_url
            else:
                # Cleanup if we lost the race
                os.remove(thread_final_mp3)
        else:
            # Check for fatal YouTube errors (private video, deleted, etc.)
            stderr_output = proc.stderr.decode('utf-8', errors='ignore').strip()
            if "Video unavailable" in stderr_output or "Private video" in stderr_output or "deleted" in stderr_output.lower():
                with open(success_flag_file, "w") as f:
                    f.write(f"FATAL: {stderr_output}")
                return f"FATAL: {stderr_output}"
    except Exception:
        pass
    finally:
        # Cleanup any stray temporary files for this thread
        if os.path.exists(thread_final_mp3):
            try:
                os.remove(thread_final_mp3)
            except Exception:
                pass
    return None

def main():
    if len(sys.argv) < 3:
        print("Usage: download_youtube.py <YOUTUBE_URL> <OUTPUT_PATH>", file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1]
    output_path = sys.argv[2]
    
    # Target base output (removing extension)
    base_output, _ = os.path.splitext(output_path)
    temp_template = f"{base_output}.%(ext)s"
    success_flag_file = f"{base_output}_success.flag"
    
    # Cleanup any old success flag or target files
    if os.path.exists(success_flag_file):
        os.remove(success_flag_file)
    if os.path.exists(output_path):
        os.remove(output_path)

    print(f"[Veyra Downloader] Initiating media acquisition for: {url}", file=sys.stderr)
    
    # First, try direct download (it might work occasionally or on local networks)
    print("[Veyra Downloader] Attempting direct download...", file=sys.stderr)
    cmd = [
        "python3", "server/bin/yt-dlp",
        "--socket-timeout", "4",
        "--retries", "0",
        "--fragment-retries", "0",
        "--extractor-retries", "0",
        "-f", "ba",
        "-x", "--audio-format", "mp3",
        "--ffmpeg-location", "/usr/bin/ffmpeg",
        "-o", temp_template,
        url
    ]
    
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode == 0:
        actual_output = f"{base_output}.mp3"
        if os.path.exists(actual_output) and actual_output != output_path:
            os.rename(actual_output, output_path)
        print("[Veyra Downloader] Direct download succeeded!", file=sys.stderr)
        sys.exit(0)

    # If direct fails, try concurrent proxy rotation
    print("[Veyra Downloader] Direct download blocked. Loading proxy pool...", file=sys.stderr)
    proxies = fetch_proxies()
    print(f"[Veyra Downloader] Loaded {len(proxies)} proxies. Starting concurrent rotation...", file=sys.stderr)

    # Run up to 60 proxies in parallel batches of 20
    batch_size = 20
    max_proxies_to_test = min(60, len(proxies))
    
    success_proxy = None
    fatal_error = None
    
    for start_idx in range(0, max_proxies_to_test, batch_size):
        if os.path.exists(success_flag_file):
            break
            
        batch = proxies[start_idx : start_idx + batch_size]
        print(f"[Veyra Downloader] Testing batch of {len(batch)} proxies concurrently...", file=sys.stderr)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=batch_size) as executor:
            futures = [
                executor.submit(download_worker, p, url, temp_template, base_output, success_flag_file)
                for p in batch
            ]
            # Wait for all futures in the current batch to complete
            for future in concurrent.futures.as_completed(futures):
                res = future.result()
                if res:
                    if res.startswith("FATAL:"):
                        fatal_error = res.replace("FATAL:", "").strip()
                    else:
                        success_proxy = res

    # Check if we succeeded
    if os.path.exists(success_flag_file):
        with open(success_flag_file, "r") as f:
            flag_content = f.read().strip()
        try:
            os.remove(success_flag_file)
        except Exception:
            pass
            
        if flag_content.startswith("FATAL:"):
            print(f"[Veyra Downloader] Fatal: {flag_content.replace('FATAL:', '').strip()}", file=sys.stderr)
            sys.exit(2)
            
        if os.path.exists(base_output + ".mp3"):
            if base_output + ".mp3" != output_path:
                os.rename(base_output + ".mp3", output_path)
            print(f"[Veyra Downloader] SUCCESS! Downloaded audio track using proxy {flag_content}", file=sys.stderr)
            sys.exit(0)

    # Final cleanup of flag file
    if os.path.exists(success_flag_file):
        try:
            os.remove(success_flag_file)
        except Exception:
            pass

    if fatal_error:
        print(f"[Veyra Downloader] Error: {fatal_error}", file=sys.stderr)
    else:
        print("[Veyra Downloader] Error: All download attempts failed. Unable to acquire video audio stream.", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    main()
