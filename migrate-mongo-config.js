const config = {
  mongodb: {
    // URL format: mongodb://username:password@host:port/database?authSource=admin
    url: process.env.DATABASE_URL || "mongodb://localhost:27017",
    databaseName: "la_toolkit",

    options: {
      useNewUrlParser: true, // (optional)
      useUnifiedTopology: true, // (optional)
      //   connectTimeoutMS: 3600000, // (optional)
      //   socketTimeoutMS: 3600000, // (optional)
    }
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: "migrations",

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: "changelog",

  // The file extension to create migrations and search for in migration dir 
  migrationFileExtension: ".js",

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determin 
  // if the file should be run.  Requires that scripts are coded to be idempotent.
  useFileHash: false,

  // Don't change this, unless you know what you're doing
  moduleSystem: 'commonjs',
};

module.exports = config;
