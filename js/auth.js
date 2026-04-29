export async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(input, storedHash) {
  return (await hashPassword(input)) === storedHash;
}

export const isAdminAuthed   = () => sessionStorage.getItem('adminAuthed') === '1';
export const setAdminAuthed  = () => sessionStorage.setItem('adminAuthed', '1');
export const clearAdminAuth  = () => sessionStorage.removeItem('adminAuthed');

export const isManagerAuthed  = () => !!sessionStorage.getItem('managerAuthed');
export const getManagerName   = () => sessionStorage.getItem('managerAuthed') || '';
export const setManagerAuthed = (name) => sessionStorage.setItem('managerAuthed', name);
export const clearManagerAuth = () => sessionStorage.removeItem('managerAuthed');

export const isAnyAuthed = () => isAdminAuthed() || isManagerAuthed();
