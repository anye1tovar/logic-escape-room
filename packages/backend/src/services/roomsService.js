/**
 * roomsService: business logic for rooms. Delegates persistence to a consumer.
 * Consumer must implement: listRooms(), getRoomById(id)
 */

function buildRoomsService(consumer) {
  async function listRooms() {
    return consumer.listRooms();
  }

  async function getRoom(id) {
    if (!id) return null;
    return consumer.getRoomById(id);
  }

  return { listRooms, getRoom };
}

module.exports = buildRoomsService;
