// User Entity Schema / Model Template
// In the future, this can be integrated with MongoDB/Mongoose or PostgreSQL/Sequelize.

export class User {
  constructor(id, username, passwordHash, name, role, avatar) {
    this.id = id;
    this.username = username;
    this.passwordHash = passwordHash;
    this.name = name;
    this.role = role;
    this.avatar = avatar;
    this.createdAt = new Date();
  }

  // Example finder method
  static async findByUsername(username) {
    // database querying logic goes here
    return null;
  }
}
