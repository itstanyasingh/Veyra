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
  } catch (err) {
    console.error('Failed to save projects to localStorage:', err);
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
