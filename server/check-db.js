import mongoose from "mongoose";
import SocialMediaPost from "./models/SocialMediaPost.js";
import dotenv from "dotenv";

dotenv.config();

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    const allPosts = await SocialMediaPost.find({}).sort({ createdAt: -1 });
    
    console.log(`Total posts in database: ${allPosts.length}\n`);
    console.log("=".repeat(80));

    allPosts.forEach((post, index) => {
      console.log(`\nPost #${index + 1}:`);
      console.log(`  ID: ${post.postId}`);
      console.log(`  Content: "${post.content.text}"`);
      console.log(`  Author: ${post.author.username}`);
      console.log(`  Crime-Related: ${post.analysis.isCrimeRelated ? '✓ YES' : '✗ NO'}`);
      if (post.analysis.isCrimeRelated) {
        console.log(`  Crime Type: ${post.analysis.crimeType}`);
        console.log(`  Severity: ${post.analysis.severity}`);
        console.log(`  Confidence: ${post.analysis.confidence}%`);
        console.log(`  Keywords: [${post.analysis.keywords.join(', ')}]`);
      }
      console.log(`  Created: ${post.createdAt}`);
    });

    console.log("\n" + "=".repeat(80));
    
    const crimeRelated = allPosts.filter(p => p.analysis.isCrimeRelated);
    console.log(`\n📊 Summary:`);
    console.log(`   Total Posts: ${allPosts.length}`);
    console.log(`   Crime-Related: ${crimeRelated.length}`);
    console.log(`   Non-Crime: ${allPosts.length - crimeRelated.length}`);

    if (crimeRelated.length > 0) {
      console.log(`\n🚨 Crime-Related Posts:`);
      crimeRelated.forEach(post => {
        console.log(`   - "${post.content.text}" (${post.analysis.crimeType}, ${post.analysis.confidence}%)`);
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkDatabase();
