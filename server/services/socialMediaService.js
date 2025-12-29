import axios from "axios";
import SocialMediaPost from "../models/SocialMediaPost.js";
import SocialMediaEvent from "../models/SocialMediaEvent.js";
import Alert from "../models/Alert.js";

class SocialMediaService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.fetchInterval = 5000; // 5 seconds
    
    // Crime-related keywords for filtering
    this.crimeKeywords = [
      // General crime terms
      "crime", "criminal", "illegal", "theft", "steal", "robbery", "burglary", 
      "assault", "attack", "violence", "fight", "weapon", "gun", "knife", "shooting",
      "murder", "kill", "homicide", "death", "injure", "hurt", "victim",
      
      // Specific crimes
      "fraud", "scam", "drugs", "narcotics", "overdose", "vandalism", "arson", 
      "kidnap", "abduction", "harassment", "stalking", "threat", "intimidation",
      
      // Suspicious activity
      "suspicious", "strange", "unusual", "weird", "concerning", "alarming",
      "emergency", "danger", "unsafe", "risky", "illegal activity",
      
      // Law enforcement terms
      "police", "cop", "officer", "detective", "investigation", "arrest", 
      "detain", "custody", "jail", "prison", "court", "legal", "law",
      
      // Location-based crime indicators
      "break in", "break-in", "carjacking", "home invasion", "looting", "riot",
      
      // Emergency situations
      "112", "emergency", "help", "danger", "flee", "escape", "chase", "ambulance", "fire",
      "stampede", "panic", "crowd crush", "accident", "incident", "tragedy"
    ];
    
    // API endpoints (you can update these with actual URLs)
    this.apiEndpoints = [
      {
        name: "primary_social_media_api",
        url: process.env.SOCIAL_MEDIA_API_URL || "https://dummy-social-media-a9ip.onrender.com/api/posts"
      }
    ];
    
    console.log("Social Media API URL:", this.apiEndpoints[0].url);
  }

  async start() {
    if (this.isRunning) {
      console.log("Social Media Service is already running");
      return;
    }

    console.log("Starting Social Media Service...");
    this.isRunning = true;
    
    // Initial fetch
    await this.fetchPosts();
    
    // Set up interval for periodic fetching
    this.intervalId = setInterval(async () => {
      try {
        await this.fetchPosts();
      } catch (error) {
        console.error("Error in scheduled fetch:", error.message);
      }
    }, this.fetchInterval);
    
    console.log(`Social Media Service started - fetching every ${this.fetchInterval/1000} seconds`);
  }

  async stop() {
    if (!this.isRunning) {
      console.log("Social Media Service is not running");
      return;
    }

    console.log("Stopping Social Media Service...");
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log("Social Media Service stopped");
  }

  async fetchPosts() {
    console.log("Fetching social media posts...");
    
    for (const endpoint of this.apiEndpoints) {
      try {
        if (!endpoint.url) {
          console.error(`No URL configured for ${endpoint.name}`);
          continue;
        }
        
        console.log(`Fetching from: ${endpoint.url}`);
        
        const response = await axios.get(endpoint.url, {
          timeout: 15000, // 15 second timeout
          validateStatus: (status) => status < 500 // Accept any status < 500
        });
        
        console.log(`Response status: ${response.status}`);
        console.log(`Response data type: ${Array.isArray(response.data) ? 'array' : typeof response.data}`);
        
        // Handle different response structures
        let posts = [];
        if (Array.isArray(response.data)) {
          posts = response.data;
        } else if (response.data && Array.isArray(response.data.posts)) {
          posts = response.data.posts;
        } else if (response.data && Array.isArray(response.data.data)) {
          posts = response.data.data;
        } else {
          console.error(`Unexpected response structure from ${endpoint.name}`);
          continue;
        }
        
        console.log(`Found ${posts.length} posts to process`);
        
        if (posts.length > 0) {
          await this.processPosts(posts, endpoint.name);
        }
        
      } catch (error) {
        console.error(`Error fetching from ${endpoint.name}:`, error.message);
        if (error.response) {
          console.error(`Response status: ${error.response.status}`);
          console.error(`Response data:`, error.response.data);
        }
        // Continue with next endpoint
        continue;
      }
    }
  }

  async processPosts(posts, source) {
    console.log(`Processing ${posts.length} posts from ${source}`);
    
    let processedCount = 0;
    let crimeRelatedCount = 0;
    let duplicateCount = 0;
    
    for (const postData of posts) {
      try {
        // Normalize post data
        const normalizedPost = this.normalizePostData(postData, source);
        
        // Check if post already exists
        const existingPost = await SocialMediaPost.findOne({ postId: normalizedPost.postId });
        if (existingPost) {
          duplicateCount++;
          continue; // Skip duplicate posts
        }

        // Analyze post for crime-related content
        const analysis = await this.analyzePost(normalizedPost);
        
        // Log every post analysis for debugging
        const contentPreview = normalizedPost.content.text.substring(0, 50);
        console.log(`Post ${normalizedPost.postId}: "${contentPreview}..." | Crime=${analysis.isCrimeRelated}, Confidence=${analysis.confidence}%, Type=${analysis.crimeType}, Keywords=[${analysis.keywords.slice(0, 5).join(', ')}]`);
        
        // Create post document
        const post = new SocialMediaPost({
          ...normalizedPost,
          analysis,
          processedAt: new Date()
        });

        await post.save();
        processedCount++;

        // If crime-related, check for event creation
        if (analysis.isCrimeRelated) {
          crimeRelatedCount++;
          await this.handleCrimeRelatedPost(post);
        }

      } catch (error) {
        console.error("Error processing post:", error.message);
        continue;
      }
    }
    
    console.log(`Processing complete: ${processedCount} new posts saved, ${crimeRelatedCount} crime-related, ${duplicateCount} duplicates skipped`);
  }

  normalizePostData(postData, source) {
    // This function normalizes your API response to our standard format
    return {
      postId: postData.id || `${source}_${Date.now()}_${Math.random()}`,
      platform: this.detectPlatform(postData) || "other",
      author: {
        username: postData.username || "unknown",
        displayName: postData.username || "Unknown User",
        followersCount: 0, // Your API doesn't provide this
        verified: false, // Your API doesn't provide this
        profileImageUrl: ""
      },
      content: {
        text: postData.content || "",
        imageUrl: postData.imageUrl || "",
        videoUrl: "", // Your API doesn't provide this
        hashtags: [], // Extract from content if needed
        mentions: [], // Extract from content if needed
        urls: [] // Extract from content if needed
      },
      metadata: {
        likes: postData.likes || 0,
        shares: 0, // Your API doesn't provide this
        comments: 0, // Your API doesn't provide this
        views: 0, // Your API doesn't provide this
        location: null, // Your API doesn't provide this
        language: "en", // Default language
        createdAt: postData.createdAt ? new Date(postData.createdAt) : new Date(),
        updatedAt: new Date()
      }
    };
  }

  detectPlatform(postData) {
    // Try to detect platform from post structure or metadata
    if (postData.tweet_id || postData.retweet_count) return "twitter";
    if (postData.post_id && postData.from) return "facebook";
    if (postData.media_type && postData.owner) return "instagram";
    if (postData.subreddit) return "reddit";
    if (postData.video_id) return "youtube";
    return "other";
  }

  async analyzePost(post) {
    // Safely get text content
    const text = (post.content?.text || post.content || "").toLowerCase();
    
    if (!text) {
      console.log("Warning: Empty text content for post", post.postId);
    }
    
    // Check for crime-related keywords
    const foundKeywords = this.crimeKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    const isCrimeRelated = foundKeywords.length > 0;
    
    // Calculate confidence based on keyword density and other factors
    let confidence = 0;
    if (isCrimeRelated) {
      confidence = Math.min(100, foundKeywords.length * 15);
      
      // Boost confidence for verified accounts or high engagement
      if (post.author.verified) confidence += 10;
      if (post.metadata.likes > 100 || post.metadata.shares > 50) confidence += 10;
      if (post.metadata.location) confidence += 5;
    }

    // Determine crime type and severity
    let crimeType = "other";
    let severity = "medium";
    
    if (isCrimeRelated) {
      crimeType = this.determineCrimeType(foundKeywords, text);
      severity = this.determineSeverity(foundKeywords, text, post);
    }

    // Simple sentiment analysis
    const sentiment = this.analyzeSentiment(text);

    return {
      isCrimeRelated,
      crimeType,
      severity,
      confidence,
      keywords: foundKeywords,
      sentiment,
      entities: [] // You can add NLP entity extraction here
    };
  }

  determineCrimeType(keywords, text) {
    const crimeTypeMap = {
      "theft": ["theft", "steal", "robbery", "burglary", "break in", "break-in", "carjacking"],
      "assault": ["assault", "attack", "violence", "fight", "weapon", "shooting"],
      "drugs": ["drugs", "narcotics", "overdose"],
      "fraud": ["fraud", "scam"],
      "vandalism": ["vandalism", "arson", "looting"],
      "suspicious_activity": ["suspicious", "strange", "unusual", "concerning", "stampede", "panic", "crowd crush", "accident", "incident", "tragedy"]
    };

    for (const [type, typeKeywords] of Object.entries(crimeTypeMap)) {
      if (typeKeywords.some(keyword => text.includes(keyword))) {
        return type;
      }
    }
    
    return "other";
  }

  determineSeverity(keywords, text, post) {
    let severityScore = 0;
    
    // High severity indicators
    const highSeverityKeywords = ["murder", "kill", "shooting", "weapon", "gun", "knife", "death"];
    const mediumSeverityKeywords = ["assault", "attack", "violence", "robbery", "theft"];
    
    if (highSeverityKeywords.some(keyword => text.includes(keyword))) {
      severityScore += 3;
    }
    if (mediumSeverityKeywords.some(keyword => text.includes(keyword))) {
      severityScore += 2;
    }
    
    // Boost based on engagement (viral potential)
    if (post.metadata.likes > 1000) severityScore += 1;
    if (post.metadata.shares > 500) severityScore += 1;
    
    // Verified account boost
    if (post.author.verified) severityScore += 1;
    
    if (severityScore >= 4) return "critical";
    if (severityScore >= 3) return "high";
    if (severityScore >= 1) return "medium";
    return "low";
  }

  analyzeSentiment(text) {
    // Simple sentiment analysis - you can replace with a more sophisticated NLP library
    const positiveWords = ["good", "great", "safe", "secure", "helped", "resolved"];
    const negativeWords = ["bad", "terrible", "dangerous", "scary", "worse", "harmful"];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  async handleCrimeRelatedPost(post) {
    console.log(`Handling crime-related post: ${post.postId}`);
    
    // Check if there's an existing event in the same area/timeframe
    const existingEvent = await this.findRelatedEvent(post);
    
    if (existingEvent) {
      // Add post to existing event
      existingEvent.posts.push(post._id);
      existingEvent.aggregatedMetrics.totalPosts = existingEvent.posts.length;
      existingEvent.aggregatedMetrics.uniqueAuthors = new Set(existingEvent.posts.map(p => p.author.username)).size;
      existingEvent.lastUpdated = new Date();
      
      // Update confidence based on new post
      existingEvent.confidence = Math.min(100, existingEvent.confidence + 5);
      
      await existingEvent.save();
      
      // Create alert if severity threshold is met
      if (existingEvent.confidence >= 70 && existingEvent.severity === "high") {
        await this.createAlert(existingEvent, post);
      }
    } else {
      // Create new event if enough confidence
      if (post.analysis.confidence >= 60) {
        await this.createNewEvent(post);
      }
    }
  }

  async findRelatedEvent(post) {
    // Look for events in same location within last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    let query = {
      createdAt: { $gte: twoHoursAgo },
      status: { $in: ["active", "monitoring"] }
    };
    
    // Add location filter if available
    if (post.metadata.location?.coordinates) {
      query["location.coordinates"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [post.metadata.location.coordinates.lng, post.metadata.location.coordinates.lat]
          },
          $maxDistance: 5000 // 5km radius
        }
      };
    } else {
      // If no location, look for similar keywords
      query.keywords = { $in: post.analysis.keywords };
    }
    
    return await SocialMediaEvent.findOne(query).sort({ createdAt: -1 });
  }

  async createNewEvent(post) {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const event = new SocialMediaEvent({
      eventId,
      title: `Potential ${post.analysis.crimeType} incident detected`,
      description: `Social media monitoring detected potential ${post.analysis.crimeType} activity based on multiple indicators.`,
      eventType: "emerging_threat",
      location: post.metadata.location,
      severity: post.analysis.severity,
      confidence: post.analysis.confidence,
      posts: [post._id],
      keywords: post.analysis.keywords,
      agencies: ["local_police"], // Default agency
      aggregatedMetrics: {
        totalPosts: 1,
        uniqueAuthors: 1,
        totalReach: post.author.followersCount || 0,
        avgSentiment: post.analysis.sentiment,
        timeSpan: {
          start: post.metadata.createdAt,
          end: post.metadata.createdAt
        }
      }
    });
    
    await event.save();
    
    // Update post with related event
    post.relatedEvent = event._id;
    await post.save();
    
    console.log(`Created new social media event: ${eventId}`);
    
    // Create alert for high severity events
    if (event.severity === "high" || event.severity === "critical") {
      await this.createAlert(event, post);
    }
  }

  async createAlert(event, post) {
    const alert = new Alert({
      type: "event_created",
      severity: event.severity,
      title: `Social Media Event: ${event.title}`,
      description: `Detected ${event.posts.length} related posts with ${event.confidence}% confidence. Location: ${event.location?.name || 'Unknown'}`,
      details: {
        socialMediaEvent: {
          eventId: event.eventId,
          postCount: event.posts.length,
          confidence: event.confidence,
          keywords: event.keywords
        },
        metadata: {
          source: "social_media_monitoring",
          platform: post.platform,
          author: post.author.username
        }
      },
      relatedEvent: event._id,
      agencies: event.agencies,
      triggeredBy: "Social Media AI"
    });
    
    await alert.save();
    
    // Emit real-time alert via Socket.IO
    if (global.io) {
      global.io.emit("new_alert", alert);
    }
    
    console.log(`Created alert for social media event: ${event.eventId}`);
  }

  // Utility method to manually trigger fetch (for testing)
  async manualFetch() {
    console.log("Manual fetch triggered");
    await this.fetchPosts();
  }
}

export default new SocialMediaService();
