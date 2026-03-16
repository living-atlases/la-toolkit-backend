/**
 * AI Query Helper
 * Handles semantic search against the LA Toolkit knowledge base (ChromaDB)
 * and returns context-aware answers with source citations
 */

const { v4: uuidv4 } = require('uuid');

module.exports = {
  friendlyName: 'AI Query',
  description: 'Query the LA Toolkit knowledge base using ChromaDB',

  inputs: {
    question: {
      type: 'string',
      required: true,
      description: 'The user question to search for in the knowledge base'
    },
    projectId: {
      type: 'string',
      required: false,
      description: 'Optional project ID to inject context'
    },
    includeContext: {
      type: 'boolean',
      defaultsTo: true,
      description: 'Whether to enrich query with project context'
    },
    topK: {
      type: 'number',
      defaultsTo: 5,
      description: 'Number of top results to return from KB'
    }
  },

  exits: {
    success: {
      outputFriendlyName: 'AI Response',
      outputDescription: 'Formatted answer with source citations'
    },
    invalidQuestion: {
      responseType: 'badRequest',
      description: 'Question is empty or invalid'
    },
    chromaDbError: {
      responseType: 'serverError',
      description: 'ChromaDB connection or query error'
    },
    projectNotFound: {
      responseType: 'notFound',
      description: 'Specified project not found'
    }
  },

  fn: async function (inputs, exits) {
    // Validate inputs
    if (!inputs.question || inputs.question.trim().length === 0) {
      return exits.invalidQuestion({
        error: 'Question cannot be empty'
      });
    }

    const question = inputs.question.trim();

    try {
      // Check if ChromaDB is available
      if (!sails.config.custom.chromaClient) {
        return exits.chromaDbError({
          error: 'ChromaDB not initialized. Knowledge base unavailable.'
        });
      }

      // Load project context if provided
      let context = null;
      let enrichedQuestion = question;

      if (inputs.includeContext && inputs.projectId) {
        context = await loadProjectContext(inputs.projectId);

        // Enrich question with context if available
        if (context) {
          enrichedQuestion = buildEnrichedQuery(question, context);
        }
      }

      // Query ChromaDB
      sails.log.debug(`[AI] Querying KB with: "${enrichedQuestion}"`);

      const chromaClient = sails.config.custom.chromaClient;

      // Get the collection (assumed to be named 'la-toolkit-kb')
      const collection = await chromaClient.getOrCreateCollection({
        name: 'la-toolkit-kb',
        metadata: { hnsw_space: 'cosine' }
      });

      // Perform semantic search
      const results = await collection.query({
        queryTexts: [enrichedQuestion],
        nResults: inputs.topK
      });

      // Process results
      let sources = [];
      let answer = '';

      if (
        results &&
        results.documents &&
        results.documents.length > 0 &&
        results.documents[0].length > 0
      ) {
        // Extract documents and distances
        const documents = results.documents[0];
        const distances = results.distances[0];
        const metadatas = results.metadatas[0];
        const ids = results.ids[0];

        // Build sources with citations
        sources = documents.map((doc, index) => {
          const distance = distances ? distances[index] : null;
          const metadata = metadatas ? metadatas[index] : {};

          // Convert distance to relevance score (0-1, inverted from distance)
          const relevance = distance !== null ? 1 - distance : 0.8;

          return {
            id: ids ? ids[index] : uuidv4(),
            file: metadata.source || 'unknown',
            line: metadata.line || null,
            relevance: parseFloat(relevance.toFixed(2)),
            snippet: doc.substring(0, 500) + (doc.length > 500 ? '...' : '')
          };
        });

        // Build answer by concatenating top results
        answer = documents.slice(0, 3).join('\n\n---\n\n');
      } else {
        answer =
          "I couldn't find relevant information in the knowledge base for your question. " +
          'Please try rephrasing or checking if the topic is available.';
      }

      // Return response
      return exits.success({
        id: uuidv4(),
        question: question,
        answer: answer,
        sources: sources,
        contextUsed: context ? buildContextSummary(context) : null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sails.log.error('[AI] Query error:', error);

      if (
        error.message.includes('project') ||
        error.message.includes('not found')
      ) {
        return exits.projectNotFound({
          error: 'Project context not found'
        });
      }

      return exits.chromaDbError({
        error: error.message || 'Failed to query knowledge base'
      });
    }
  }
};

/**
 * Load project context from database
 * @param {string} projectId - The project ID
 * @returns {object|null} - Project context or null
 */
async function loadProjectContext(projectId) {
  try {
    // Find project in MongoDB (assuming Project model exists)
    const Project = sails.models.project;

    if (!Project) {
      sails.log.warn('[AI] Project model not found');
      return null;
    }

    const project = await Project.findOne({
      id: projectId
    });

    if (!project) {
      sails.log.warn(`[AI] Project not found: ${projectId}`);
      return null;
    }

    // Extract relevant context
    const context = {
      projectId: project.id,
      projectName: project.longName || project.shortName,
      deploymentMethod: project.deploymentMethod || 'vm',
      isCluster: project.isCluster || false,
      isCreated: project.isCreated || false,
      isHub: project.isHub || false,
      status: project.status || 'created',

      // Services configuration
      services: (project.services || [])
        .filter((s) => s.enabled !== false)
        .map((s) => s.name),

      // Server information
      servers: (project.servers || []).map((s) => ({
        hostname: s.hostname,
        ip: s.ip,
        services: s.services || []
      })),

      // Last command info
      lastCommand: project.lastCmdEntry ? project.lastCmdEntry.cmd : null,
      lastCommandStatus: project.lastCmdEntry
        ? project.lastCmdEntry.status
        : null,

      // Deployment info
      alaInstallRelease: project.alaInstallRelease,
      generatorRelease: project.generatorRelease
    };

    sails.log.debug('[AI] Loaded context for project:', project.shortName);

    return context;
  } catch (error) {
    sails.log.error('[AI] Error loading project context:', error);
    return null;
  }
}

/**
 * Build enriched query with project context
 * @param {string} question - Original question
 * @param {object} context - Project context
 * @returns {string} - Enriched query
 */
function buildEnrichedQuery(question, context) {
  const contextParts = [];

  contextParts.push(`Deployment Method: ${context.deploymentMethod}`);

  if (context.services && context.services.length > 0) {
    contextParts.push(`Services: ${context.services.join(', ')}`);
  }

  if (context.isCluster) {
    contextParts.push('Setup Type: Cluster');
  }

  if (context.alaInstallRelease) {
    contextParts.push(`ALA Install Version: ${context.alaInstallRelease}`);
  }

  const contextStr = contextParts.join('\n');

  return `Context:\n${contextStr}\n\nQuestion: ${question}`;
}

/**
 * Build human-readable context summary
 * @param {object} context - Project context
 * @returns {object} - Context summary
 */
function buildContextSummary(context) {
  return {
    projectName: context.projectName,
    deploymentMethod: context.deploymentMethod,
    services: context.services,
    serverCount: context.servers ? context.servers.length : 0,
    currentStatus: context.status,
    lastCommand: context.lastCommand,
    isCluster: context.isCluster
  };
}
