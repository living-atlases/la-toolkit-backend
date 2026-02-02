const test = require('ava');

// Mock Sails for testing
const createMockSails = () => {
  const mockModels = {};

  return {
    models: mockModels,
    config: {
      datastores: {
        default: {}
      }
    }
  };
};

test('Cluster model includes serverId attribute', (t) => {
  const Cluster = require('../api/models/Cluster.js');

  // Verify that Cluster has serverId attribute
  t.true(
    Cluster.attributes.hasOwnProperty('serverId'),
    'Cluster model must have serverId attribute'
  );

  // Verify serverId is optional (allowNull: true)
  t.true(
    Cluster.attributes.serverId.allowNull === true,
    'serverId must be optional (allowNull: true)'
  );
});

test('Cluster model serverId references Server model', (t) => {
  const Cluster = require('../api/models/Cluster.js');

  const serverIdAttr = Cluster.attributes.serverId;

  // Verify serverId is a model reference
  t.is(
    serverIdAttr.model,
    'server',
    'serverId must reference the server model'
  );

  // In Sails.js, singular associations automatically allow null values
  // so allowNull should not be explicitly set
  t.is(
    serverIdAttr.allowNull,
    undefined,
    'allowNull should not be explicitly set on associations in Sails.js'
  );
});

test('Cluster model preserves all required attributes', (t) => {
  const Cluster = require('../api/models/Cluster.js');

  const requiredAttrs = ['name', 'type', 'projectId', 'serverId', 'serviceDeploys'];

  for (const attr of requiredAttrs) {
    t.true(
      Cluster.attributes.hasOwnProperty(attr),
      `Cluster model must have ${attr} attribute`
    );
  }
});

test('Cluster type enum includes dockerCompose', (t) => {
  const Cluster = require('../api/models/Cluster.js');

  const typeAttr = Cluster.attributes.type;
  const validTypes = typeAttr.isIn;

  t.true(
    validTypes.includes('dockerCompose'),
    'Cluster type enum must include dockerCompose'
  );
});

test('Cluster model JSON schema is valid', (t) => {
  const Cluster = require('../api/models/Cluster.js');

  // Verify basic structure
  t.is(typeof Cluster.tableName, 'string', 'tableName must be a string');
  t.is(typeof Cluster.attributes, 'object', 'attributes must be an object');

  // Verify it has the essential attributes
  t.true(Cluster.attributes.projectId !== undefined);
  t.true(Cluster.attributes.serverId !== undefined);
});
