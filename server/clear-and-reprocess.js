import mongoose from "mongoose";
import SocialMediaPost from "./models/SocialMediaPost.js";
import SocialMediaEvent from "./models/SocialMediaEvent.js";
import dotenv from "dotenv";

dotenv.config();

async function clearAndReprocess() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // Count existing posts
    const postCount = await SocialMediaPost.countDocuments();
    const eventCount = await SocialMediaEvent.countDocuments();
    
    console.log(`Found ${postCount} posts and ${eventCount} events in database`);
    
    if (postCount > 0 || eventCount > 0) {
      console.log("\nClearing social media data...");
      
      await SocialMediaPost.deleteMany({});
      await SocialMediaEvent.deleteMany({});
      
      console.log("✓ Database cleared successfully");
    } else {
      console.log("\nDatabase is already empty");
    }

    console.log("\n✓ Ready for fresh processing");
    console.log("\nThe social media service will now fetch and analyze all posts with updated keywords.");
    console.log("Posts with 'stampede', 'robbery', and other crime keywords will be detected.");

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

clearAndReprocess();
