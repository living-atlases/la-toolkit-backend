/**
 * AI Query Controller
 * REST endpoint for querying the knowledge base
 */

module.exports = async function aiQuery(req, res) {
  const question = req.body?.question;
  const projectId = req.body?.projectId;
  const includeContext = req.body?.includeContext ?? true;
  const topK = req.body?.topK ?? 5;

  // Validate inputs
  if (!question) {
    return res.badRequest({
      error: 'Question is required'
    });
  }

  try {
    // Call AI helper
    const response = await sails.helpers.aiQuery({
      question: question,
      projectId: projectId,
      includeContext: includeContext,
      topK: topK
    });

    return res.ok(response);
  } catch (error) {
    sails.log.error('[AI Controller] Error:', error);
    return res.serverError({
      error: error.message || 'Failed to process AI query'
    });
  }
};
