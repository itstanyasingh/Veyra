import { Project } from '../types';
import { deleteMedia } from './mediaStorage';

const STORAGE_KEY = 'veyra_projects_v1';

export function getStoredProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to parse stored projects from localStorage:', err);
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    window.dispatchEvent(new Event('veyra_projects_changed'));
  } catch (err: any) {
    console.error('Failed to save projects to localStorage:', err);
    // QuotaExceededError handling: strip heavy inline binary/media data if storage quota exceeded
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      try {
        const sanitizedProjects = projects.map(p => {
          const clone = { ...p };
          if (clone.mediaUrl && clone.mediaUrl.startsWith('data:')) {
            delete clone.mediaUrl;
          }
          return clone;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedProjects));
        window.dispatchEvent(new Event('veyra_projects_changed'));
        console.warn('Saved projects after stripping inline data due to storage quota limits.');
      } catch (retryErr) {
        console.error('Critical: Local storage quota exceeded even after trimming data:', retryErr);
      }
    }
  }
}

export function getProjectById(id: string): Project | null {
  const projects = getStoredProjects();
  return projects.find((p) => p.id === id) || null;
}

export function createProject(project: Project): void {
  const projects = getStoredProjects();
  const updated = [project, ...projects.filter((p) => p.id !== project.id)];
  saveProjects(updated);
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const projects = getStoredProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const updatedProject: Project = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  projects[index] = updatedProject;
  saveProjects(projects);
  return updatedProject;
}

export function deleteProject(id: string): boolean {
  const projects = getStoredProjects();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length !== projects.length) {
    saveProjects(filtered);
    // Asynchronously delete media from IndexedDB
    deleteMedia(id).catch((err) => {
      console.warn(`Failed to remove media file for project ${id}:`, err);
    });
    return true;
  }
  return false;
}
