async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Không thể hoàn tất yêu cầu.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  signup: (input) => request('/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  login: (input) => request('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCourses: (semester) => request(`/courses?semester=${encodeURIComponent(semester)}`),
  createCourse: (input) => request('/courses', { method: 'POST', body: JSON.stringify(input) }),
  importCourses: (input) => request('/courses/import', { method: 'POST', body: JSON.stringify(input) }),
  updateCourse: (id, input) => request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
  generateSchedules: (semester) => request('/schedules/generate', {
    method: 'POST',
    body: JSON.stringify({ semester }),
  }),
  getSchedules: (semester) => request(`/schedules?semester=${encodeURIComponent(semester)}`),
  saveSchedule: (input) => request('/schedules', { method: 'POST', body: JSON.stringify(input) }),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: 'DELETE' }),
};
