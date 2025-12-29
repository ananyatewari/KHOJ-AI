import axios from "axios";

const SOCIAL_MEDIA_API_URL = "https://dummy-social-media-a9ip.onrender.com/api/posts";

const crimeKeywords = [
  "crime", "criminal", "illegal", "theft", "steal", "robbery", "burglary", 
  "assault", "attack", "violence", "fight", "weapon", "gun", "knife", "shooting",
  "murder", "kill", "homicide", "death", "injure", "hurt", "victim",
  "fraud", "scam", "drugs", "narcotics", "overdose", "vandalism", "arson", 
  "kidnap", "abduction", "harassment", "stalking", "threat", "intimidation",
  "suspicious", "strange", "unusual", "weird", "concerning", "alarming",
  "emergency", "danger", "unsafe", "risky", "illegal activity",
  "police", "cop", "officer", "detective", "investigation", "arrest", 
  "detain", "custody", "jail", "prison", "court", "legal", "law",
  "break in", "break-in", "carjacking", "home invasion", "looting", "riot",
  "112", "emergency", "help", "danger", "flee", "escape", "chase", "ambulance", "fire",
  "stampede", "panic", "crowd crush", "accident", "incident", "tragedy"
];

async function testSocialMediaAPI() {
  // console.log("Testing Social Media API Integration...\n");
  console.log(`Fetching from: ${SOCIAL_MEDIA_API_URL}\n`);

  try {
    const response = await axios.get(SOCIAL_MEDIA_API_URL, {
      timeout: 15000
    });

    // console.log(`✓ API Response Status: ${response.status}`);
    // console.log(`✓ Response Type: ${typeof response.data}`);

    let posts = [];
    if (Array.isArray(response.data)) {
      posts = response.data;
    } else if (response.data && Array.isArray(response.data.posts)) {
      posts = response.data.posts;
    } else if (response.data && Array.isArray(response.data.data)) {
      posts = response.data.data;
    }

    console.log(`✓ Total Posts Found: ${posts.length}\n`);

    if (posts.length === 0) {
      console.log("⚠ No posts found in API response");
      return;
    }

    console.log("Analyzing posts for crime-related content...\n");
    console.log("=".repeat(80));

    let crimeRelatedCount = 0;

    posts.forEach((post, index) => {
      const text = (post.content || "").toLowerCase();
      const foundKeywords = crimeKeywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      );

      const isCrimeRelated = foundKeywords.length > 0;
      if (isCrimeRelated) crimeRelatedCount++;

      console.log(`\nPost #${index + 1}:`);
      console.log(`  ID: ${post.id}`);
      console.log(`  Author: ${post.username}`);
      console.log(`  Content: "${post.content}"`);
      console.log(`  Created: ${post.createdAt}`);
      console.log(`  Crime-Related: ${isCrimeRelated ? '✓ YES' : '✗ NO'}`);
      
      if (isCrimeRelated) {
        console.log(`  Matched Keywords: [${foundKeywords.slice(0, 5).join(', ')}]`);
        const confidence = Math.min(100, foundKeywords.length * 15);
        console.log(`  Confidence: ${confidence}%`);
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Total Posts: ${posts.length}`);
    console.log(`   Crime-Related: ${crimeRelatedCount}`);
    console.log(`   Non-Crime: ${posts.length - crimeRelatedCount}`);
    console.log(`   Detection Rate: ${((crimeRelatedCount / posts.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error("✗ Error fetching from API:", error.message);
    if (error.response) {
      console.error(`  Response Status: ${error.response.status}`);
      console.error(`  Response Data:`, error.response.data);
    }
  }
}

testSocialMediaAPI();
