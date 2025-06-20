/*
# User History Manager Edge Function

This function manages user interaction history for the dashboard.
It provides endpoints for saving, retrieving, and managing user history.

## Features
- Save AI interaction records
- Retrieve paginated user history
- Delete specific history entries
- Get user statistics and insights
- Export user data

## Usage
POST /functions/v1/user-history-manager
Body: {
  "action": "save_interaction" | "get_history" | "delete_interaction" | "get_stats" | "export_data",
  "data": { ... } // Action-specific data
}
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { Middleware } from "../_shared/middleware.ts";

interface SaveInteractionData {
  toolId: string;
  queryText: string;
  responseText: string;
  documentId?: string;
  modelUsed: string;
  queryComplexity?: number;
  responseQuality?: 'low' | 'standard' | 'high';
  processingTime?: number;
  metadata?: Record<string, any>;
}

interface GetHistoryData {
  limit?: number;
  offset?: number;
  toolFilter?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface DeleteInteractionData {
  interactionId: string;
}

interface HistoryManagerRequest {
  action: 'save_interaction' | 'get_history' | 'delete_interaction' | 'get_stats' | 'export_data';
  data?: SaveInteractionData | GetHistoryData | DeleteInteractionData;
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return Middleware.handleCORS(req.headers.get('origin') || undefined);
    }

    if (req.method !== "POST") {
      return Middleware.createErrorResponse(
        "Method not allowed",
        "METHOD_NOT_ALLOWED",
        405,
        req.headers.get('origin') || undefined
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return Middleware.createErrorResponse(
        "Supabase configuration missing",
        "CONFIG_ERROR",
        500,
        req.headers.get('origin') || undefined
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Middleware.createErrorResponse(
        "Authentication required",
        "AUTH_REQUIRED",
        401,
        req.headers.get('origin') || undefined
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return Middleware.createErrorResponse(
        "Invalid authentication",
        "AUTH_INVALID",
        401,
        req.headers.get('origin') || undefined
      );
    }

    const { action, data }: HistoryManagerRequest = await req.json();

    let result: any;

    switch (action) {
      case 'save_interaction':
        result = await saveInteraction(supabase, user.id, data as SaveInteractionData);
        break;

      case 'get_history':
        result = await getHistory(supabase, user.id, data as GetHistoryData);
        break;

      case 'delete_interaction':
        result = await deleteInteraction(supabase, user.id, data as DeleteInteractionData);
        break;

      case 'get_stats':
        result = await getUserStats(supabase, user.id);
        break;

      case 'export_data':
        result = await exportUserData(supabase, user.id);
        break;

      default:
        return Middleware.createErrorResponse(
          "Invalid action. Supported actions: save_interaction, get_history, delete_interaction, get_stats, export_data",
          "INVALID_ACTION",
          400,
          req.headers.get('origin') || undefined
        );
    }

    return Middleware.createSuccessResponse({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    }, req.headers.get('origin') || undefined);

  } catch (error) {
    console.error("Error in user-history-manager function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing the history request",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});

async function saveInteraction(supabase: any, userId: string, data: SaveInteractionData) {
  const {
    toolId,
    queryText,
    responseText,
    documentId,
    modelUsed,
    queryComplexity = 0,
    responseQuality = 'standard',
    processingTime = 0,
    metadata = {}
  } = data;

  // Validate required fields
  if (!toolId || !queryText || !responseText || !modelUsed) {
    throw new Error('Missing required fields: toolId, queryText, responseText, modelUsed');
  }

  // Truncate long texts to prevent database issues
  const truncatedQuery = queryText.length > 5000 ? queryText.substring(0, 5000) + '...' : queryText;
  const truncatedResponse = responseText.length > 10000 ? responseText.substring(0, 10000) + '...' : responseText;

  const { data: interaction, error } = await supabase
    .from('user_history')
    .insert({
      user_id: userId,
      tool_id: toolId,
      query_text: truncatedQuery,
      response_text: truncatedResponse,
      document_id: documentId || null,
      model_used: modelUsed,
      query_complexity: queryComplexity,
      response_quality: responseQuality,
      processing_time: processingTime,
      metadata: {
        ...metadata,
        originalQueryLength: queryText.length,
        originalResponseLength: responseText.length,
        truncated: queryText.length > 5000 || responseText.length > 10000
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving interaction:', error);
    throw new Error(`Failed to save interaction: ${error.message}`);
  }

  return {
    message: 'Interaction saved successfully',
    interactionId: interaction.id,
    truncated: queryText.length > 5000 || responseText.length > 10000
  };
}

async function getHistory(supabase: any, userId: string, data: GetHistoryData = {}) {
  const {
    limit = 20,
    offset = 0,
    toolFilter,
    dateFrom,
    dateTo
  } = data;

  let query = supabase
    .from('user_history')
    .select(`
      id,
      tool_id,
      query_text,
      response_text,
      model_used,
      query_complexity,
      response_quality,
      processing_time,
      metadata,
      created_at,
      documents (
        id,
        filename,
        file_type
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (toolFilter) {
    query = query.eq('tool_id', toolFilter);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: history, error, count } = await query;

  if (error) {
    console.error('Error fetching history:', error);
    throw new Error(`Failed to fetch history: ${error.message}`);
  }

  // Process history entries for display
  const processedHistory = history?.map(entry => ({
    ...entry,
    query_preview: entry.query_text.length > 100 
      ? entry.query_text.substring(0, 100) + '...' 
      : entry.query_text,
    response_preview: entry.response_text.length > 200 
      ? entry.response_text.substring(0, 200) + '...' 
      : entry.response_text,
    tool_name: getToolDisplayName(entry.tool_id),
    has_document: !!entry.documents
  })) || [];

  return {
    history: processedHistory,
    total: count || 0,
    limit,
    offset,
    hasMore: (count || 0) > offset + limit
  };
}

async function deleteInteraction(supabase: any, userId: string, data: DeleteInteractionData) {
  const { interactionId } = data;

  if (!interactionId) {
    throw new Error('Interaction ID is required');
  }

  const { error } = await supabase
    .from('user_history')
    .delete()
    .eq('user_id', userId)
    .eq('id', interactionId);

  if (error) {
    console.error('Error deleting interaction:', error);
    throw new Error(`Failed to delete interaction: ${error.message}`);
  }

  return {
    message: 'Interaction deleted successfully',
    interactionId
  };
}

async function getUserStats(supabase: any, userId: string) {
  // Get basic stats using the database function
  const { data: stats, error: statsError } = await supabase
    .rpc('get_user_stats', { target_user_id: userId });

  if (statsError) {
    console.error('Error fetching user stats:', statsError);
    throw new Error(`Failed to fetch user stats: ${statsError.message}`);
  }

  const userStats = stats?.[0] || {
    total_interactions: 0,
    tools_used: 0,
    documents_uploaded: 0,
    avg_query_complexity: 0,
    most_used_tool: null,
    last_activity: null
  };

  // Get additional analytics
  const { data: toolUsage, error: toolError } = await supabase
    .from('user_history')
    .select('tool_id')
    .eq('user_id', userId);

  const toolCounts = toolUsage?.reduce((acc: Record<string, number>, item: any) => {
    acc[item.tool_id] = (acc[item.tool_id] || 0) + 1;
    return acc;
  }, {}) || {};

  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentActivity, error: activityError } = await supabase
    .from('user_history')
    .select('created_at, tool_id')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  return {
    overview: {
      totalInteractions: userStats.total_interactions,
      toolsUsed: userStats.tools_used,
      documentsUploaded: userStats.documents_uploaded,
      avgQueryComplexity: Math.round((userStats.avg_query_complexity || 0) * 10) / 10,
      mostUsedTool: userStats.most_used_tool ? getToolDisplayName(userStats.most_used_tool) : 'None',
      lastActivity: userStats.last_activity
    },
    toolUsage: Object.entries(toolCounts).map(([toolId, count]) => ({
      toolId,
      toolName: getToolDisplayName(toolId),
      count
    })).sort((a, b) => b.count - a.count),
    recentActivity: recentActivity?.map(activity => ({
      date: activity.created_at,
      toolName: getToolDisplayName(activity.tool_id)
    })) || []
  };
}

async function exportUserData(supabase: any, userId: string) {
  // Get all user history
  const { data: history, error: historyError } = await supabase
    .from('user_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (historyError) {
    throw new Error(`Failed to export history: ${historyError.message}`);
  }

  // Get all user documents
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, filename, file_type, file_size, word_count, complexity, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (docsError) {
    throw new Error(`Failed to export documents: ${docsError.message}`);
  }

  return {
    exportDate: new Date().toISOString(),
    userId,
    history: history || [],
    documents: documents || [],
    summary: {
      totalInteractions: history?.length || 0,
      totalDocuments: documents?.length || 0,
      dateRange: {
        earliest: history?.[history.length - 1]?.created_at || null,
        latest: history?.[0]?.created_at || null
      }
    }
  };
}

function getToolDisplayName(toolId: string): string {
  const toolNames: Record<string, string> = {
    'legalese': 'Legalese Decoder',
    'medispeak': 'MediSpeak',
    'finfriend': 'FinFriend',
    'buildbot': 'BuildBot',
    'edusimplify': 'EduSimplify',
    'homelingo': 'HomeLingo',
    'techtalk': 'TechTalk',
    'adanalyst': 'AdAnalyst',
    'policypal': 'PolicyPal'
  };
  
  return toolNames[toolId] || toolId;
}