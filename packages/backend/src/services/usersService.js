function buildUsersService(usersConsumer) {
  async function listUsers() {
    return usersConsumer.listUsers();
  }

  return {
    listUsers,
  };
}

module.exports = buildUsersService;

