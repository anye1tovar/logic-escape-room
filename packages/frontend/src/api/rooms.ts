export async function fetchRooms() {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/rooms`);
  if (!res.ok) throw new Error("Failed to fetch rooms");
  return res.json();
}

export async function fetchRoom(id: string) {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/rooms/${id}`
  );
  if (!res.ok) throw new Error("Failed to fetch room");
  return res.json();
}
