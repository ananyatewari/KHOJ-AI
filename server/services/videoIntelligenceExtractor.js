import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Analyze video detection results and extract actionable intelligence
 * for inter-agency coordination and threat assessment
 */
export async function extractVideoIntelligence({ 
  detections, 
  cameraInfo, 
  videoMetadata,
  originalName 
}) {
  try {
    // Prepare detection summary for AI analysis
    const detectionSummary = prepareDetectionSummary(detections);
    
    const systemPrompt = `You are an expert intelligence analyst specializing in CCTV forensic analysis for law enforcement.

Your task is to analyze video detection data and identify suspicious activities, criminal behavior, and security threats.

**CRITICAL ANALYSIS AREAS:**
1. **Suspicious Activity Detection**: Look for patterns indicating:
   - Theft, robbery, snatching (sudden movements, proximity changes, fleeing)
   - Assault, violence, confrontation (multiple persons in close proximity, sudden dispersal)
   - Loitering, casing (persons staying in one area, repeated appearances)
   - Vandalism, property damage
   - Unauthorized access, trespassing

2. **Behavioral Pattern Analysis**:
   - Sudden appearance/disappearance of persons or vehicles
   - Rapid movement patterns (running, fleeing)
   - Clustering of persons (crowds, gatherings, confrontations)
   - Objects appearing/disappearing (potential theft indicators)
   - Time-of-day anomalies (unusual activity at odd hours)

3. **Threat Level Assessment**:
   - HIGH: Violence, weapons, active crimes, immediate danger
   - MEDIUM: Suspicious behavior, potential crimes, unusual patterns
   - LOW: Normal activity with minor concerns

4. **Entity & Evidence Extraction**:
   - Persons involved (suspects, victims, witnesses)
   - Vehicles (getaway vehicles, suspicious vehicles)
   - Objects of interest (stolen items, weapons, evidence)
   - Locations (crime scene, escape routes)

5. **Investigation Priorities**:
   - Identify suspects and victims
   - Establish timeline of events
   - Suggest evidence collection points
   - Recommend witness interviews

**IMPORTANT**: Even with limited detection data, infer suspicious activities from:
- Sudden changes in person/vehicle counts between frames
- Unusual movement patterns
- Temporal anomalies
- Context clues from location and time

Be proactive in identifying potential criminal activity. Focus on actionable intelligence for investigators.`;

    const userPrompt = `Analyze this CCTV footage intelligence:

**Video Information:**
- File: ${originalName}
- Camera ID: ${cameraInfo.cameraId || 'Unknown'}
- Location: ${cameraInfo.location || 'Unknown'}
- Duration: ${videoMetadata.duration ? Math.round(videoMetadata.duration) + 's' : 'Unknown'}
- Resolution: ${videoMetadata.width}x${videoMetadata.height}
- Timestamp: ${new Date().toISOString()}

**Detection Data:**
${detectionSummary}

**IMPORTANT CLARIFICATION:**
- "Total detections" = cumulative count across all frames (same person in 10 frames = 10 detections)
- For your summary, focus on UNIQUE/DISTINCT entities (e.g., "3 distinct persons" not "122 person detections")
- Describe the scene in terms of actual individuals present, not frame-by-frame counts

Provide a comprehensive intelligence analysis in JSON format with these fields:

{
  "threatLevel": "high|medium|low|none",
  "incidentType": "string (e.g., 'suspicious activity', 'crowd gathering', 'vehicle of interest', 'normal surveillance')",
  "summary": "2-3 sentence executive summary of what was observed",
  "keyFindings": [
    "specific observation 1",
    "specific observation 2",
    "specific observation 3"
  ],
  "entitiesDetected": {
    "persons": ["description of person 1", "description of person 2"],
    "vehicles": ["vehicle type and details"],
    "objects": ["significant objects detected"],
    "locations": ["specific locations or areas of interest"]
  },
  "temporalAnalysis": {
    "peakActivity": "time period with most activity",
    "patterns": ["pattern 1", "pattern 2"],
    "anomalies": ["unusual observation 1", "unusual observation 2"]
  },
  "riskIndicators": [
    "risk factor 1",
    "risk factor 2"
  ],
  "agencyAlerts": [
    {
      "agency": "Police|Fire|Medical|Traffic|Other",
      "reason": "why this agency should be notified",
      "priority": "high|medium|low"
    }
  ],
  "recommendations": [
    "actionable recommendation 1",
    "actionable recommendation 2",
    "actionable recommendation 3"
  ],
  "crossReferenceOpportunities": [
    "suggest checking police database for...",
    "correlate with emergency logs for...",
    "compare with social media feeds for..."
  ]
}

Return ONLY valid JSON. Be specific and factual based on the detection data.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const intelligenceData = JSON.parse(completion.choices[0].message.content);
    
    // Add metadata
    intelligenceData.analysisTimestamp = new Date().toISOString();
    intelligenceData.detectionStats = getDetectionStats(detections);
    intelligenceData.cameraMetadata = {
      cameraId: cameraInfo.cameraId,
      location: cameraInfo.location,
      coordinates: cameraInfo.coordinates
    };

    return intelligenceData;
  } catch (error) {
    console.error('Error extracting video intelligence:', error);
    return null;
  }
}

/**
 * Prepare detection summary for AI analysis with behavioral pattern analysis
 */
function prepareDetectionSummary(detections) {
  if (!detections || detections.length === 0) {
    return "No objects detected in the video.";
  }

  // Group detections by class
  const grouped = {};
  let totalDetections = 0;
  const frameAnalysis = [];

  detections.forEach(detection => {
    const frameData = {
      frameNumber: detection.frameNumber,
      timestamp: detection.timestamp,
      persons: 0,
      vehicles: 0,
      objects: []
    };

    if (detection.objects && detection.objects.length > 0) {
      detection.objects.forEach(obj => {
        if (!grouped[obj.class]) {
          grouped[obj.class] = {
            count: 0,
            avgConfidence: 0,
            frames: [],
            positions: []
          };
        }
        grouped[obj.class].count++;
        grouped[obj.class].avgConfidence += obj.score;
        grouped[obj.class].frames.push(detection.frameNumber);
        
        // Track positions for movement analysis
        if (obj.bbox) {
          grouped[obj.class].positions.push({
            frame: detection.frameNumber,
            x: obj.bbox.x || 0,
            y: obj.bbox.y || 0
          });
        }

        totalDetections++;

        // Count by category
        if (obj.class === 'person') frameData.persons++;
        else if (['car', 'truck', 'bus', 'motorcycle', 'vehicle'].includes(obj.class)) frameData.vehicles++;
        
        frameData.objects.push(obj.class);
      });
    }

    frameAnalysis.push(frameData);
  });

  // Calculate averages and patterns
  Object.keys(grouped).forEach(key => {
    grouped[key].avgConfidence = (grouped[key].avgConfidence / grouped[key].count * 100).toFixed(1);
    grouped[key].firstSeen = Math.min(...grouped[key].frames);
    grouped[key].lastSeen = Math.max(...grouped[key].frames);
    grouped[key].continuity = grouped[key].frames.length / (grouped[key].lastSeen - grouped[key].firstSeen + 1);
    delete grouped[key].frames;
    delete grouped[key].positions;
  });

  // Analyze temporal patterns
  const personCounts = frameAnalysis.map(f => f.persons);
  const vehicleCounts = frameAnalysis.map(f => f.vehicles);
  const maxPersons = Math.max(...personCounts);
  const minPersons = Math.min(...personCounts);
  const avgPersons = (personCounts.reduce((a, b) => a + b, 0) / personCounts.length).toFixed(1);
  
  // Detect sudden changes (potential suspicious activity)
  const suddenChanges = [];
  for (let i = 1; i < frameAnalysis.length; i++) {
    const personDiff = Math.abs(frameAnalysis[i].persons - frameAnalysis[i-1].persons);
    const vehicleDiff = Math.abs(frameAnalysis[i].vehicles - frameAnalysis[i-1].vehicles);
    
    if (personDiff >= 2) {
      suddenChanges.push(`Frame ${frameAnalysis[i].frameNumber}: Sudden change in persons (${personDiff > 0 ? '+' : ''}${frameAnalysis[i].persons - frameAnalysis[i-1].persons})`);
    }
    if (vehicleDiff >= 1) {
      suddenChanges.push(`Frame ${frameAnalysis[i].frameNumber}: Vehicle movement detected`);
    }
  }

  let summary = `**DETECTION OVERVIEW**\n`;
  summary += `Total Detections: ${totalDetections} across ${detections.length} frames\n`;
  summary += `Duration: ~${Math.round(detections.length * 0.5)}s (assuming 2 fps sampling)\n\n`;

  summary += `**DETECTED OBJECTS (Cumulative Frame Counts):**\n`;
  Object.entries(grouped)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([className, data]) => {
      const estimatedUnique = Math.ceil(data.count / detections.length);
      summary += `- ${className}: ${data.count} detection events across frames (estimated ~${estimatedUnique} distinct ${className}${estimatedUnique > 1 ? 's' : ''}, confidence: ${data.avgConfidence}%, frames ${data.firstSeen}-${data.lastSeen}, continuity: ${(data.continuity * 100).toFixed(0)}%)\n`;
    });

  summary += `\n**TEMPORAL PATTERNS:**\n`;
  summary += `- Person count: Min=${minPersons}, Max=${maxPersons}, Avg=${avgPersons}\n`;
  summary += `- Peak activity: Frame with ${maxPersons} persons\n`;
  
  if (suddenChanges.length > 0) {
    summary += `\n**SUSPICIOUS ACTIVITY INDICATORS:**\n`;
    suddenChanges.slice(0, 5).forEach(change => {
      summary += `- ${change}\n`;
    });
  }

  summary += `\n**BEHAVIORAL NOTES:**\n`;
  if (maxPersons - minPersons >= 3) {
    summary += `- Significant variation in person count suggests movement/activity\n`;
  }
  if (grouped['person'] && grouped['person'].continuity < 0.5) {
    summary += `- Intermittent person presence may indicate fleeing or rapid movement\n`;
  }
  if (vehicleCounts.some(v => v > 0)) {
    summary += `- Vehicle presence detected - potential getaway vehicle or traffic\n`;
  }

  return summary;
}

/**
 * Get detection statistics
 */
function getDetectionStats(detections) {
  const stats = {
    totalFrames: detections.length,
    totalObjects: 0,
    uniqueClasses: new Set(),
    avgObjectsPerFrame: 0,
    framesWithDetections: 0
  };

  detections.forEach(detection => {
    if (detection.objects && detection.objects.length > 0) {
      stats.framesWithDetections++;
      stats.totalObjects += detection.objects.length;
      detection.objects.forEach(obj => {
        stats.uniqueClasses.add(obj.class);
      });
    }
  });

  stats.avgObjectsPerFrame = stats.framesWithDetections > 0 
    ? (stats.totalObjects / stats.framesWithDetections).toFixed(2)
    : 0;
  stats.uniqueClasses = Array.from(stats.uniqueClasses);

  return stats;
}

/**
 * Generate quick intelligence summary without full AI analysis
 * Used as fallback or for quick preview
 */
export function generateQuickIntelligence(detections, cameraInfo) {
  const stats = getDetectionStats(detections);
  
  // Determine threat level based on detections
  let threatLevel = 'low';
  const personCount = detections.reduce((sum, d) => 
    sum + (d.objects?.filter(o => o.class === 'person').length || 0), 0
  );
  
  if (personCount > 20) threatLevel = 'medium';
  if (personCount > 50) threatLevel = 'high';
  
  // Check for vehicles
  const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle'];
  const vehicleCount = detections.reduce((sum, d) => 
    sum + (d.objects?.filter(o => vehicleClasses.includes(o.class)).length || 0), 0
  );

  return {
    threatLevel,
    incidentType: personCount > 20 ? 'crowd gathering' : 'normal surveillance',
    summary: `Detected ${stats.totalObjects} objects across ${stats.totalFrames} frames. ${personCount} persons and ${vehicleCount} vehicles identified.`,
    detectionStats: stats,
    quickAnalysis: true
  };
}
