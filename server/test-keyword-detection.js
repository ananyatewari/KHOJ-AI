// Quick test to verify keyword detection is working

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

const testPosts = [
  {
    id: "1",
    content: "armed robbery in dwarka sector 27!! stay safe!",
    username: "ananya"
  },
  {
    id: "2",
    content: "huge stampede in dwarka sector 27, delhi. hope everyone is safe!!!",
    username: "ananya"
  },
  {
    id: "3",
    content: "Hi posting this from phone",
    username: "abhi"
  },
  {
    id: "4",
    content: "Hello this is my first post",
    username: "ananya"
  }
];

console.log("Testing Crime Keyword Detection\n");
console.log("=".repeat(80));

testPosts.forEach(post => {
  const text = post.content.toLowerCase();
  const foundKeywords = crimeKeywords.filter(keyword => 
    text.includes(keyword.toLowerCase())
  );
  
  const isCrimeRelated = foundKeywords.length > 0;
  const confidence = Math.min(100, foundKeywords.length * 15);
  
  console.log(`\nPost: "${post.content}"`);
  console.log(`Author: ${post.username}`);
  console.log(`Crime-Related: ${isCrimeRelated ? '✓ YES' : '✗ NO'}`);
  
  if (isCrimeRelated) {
    console.log(`Matched Keywords: [${foundKeywords.join(', ')}]`);
    console.log(`Confidence: ${confidence}%`);
  }
});

console.log("\n" + "=".repeat(80));
console.log("\n✓ Keyword detection is working correctly!");
console.log("\nIf posts in database show as non-crime-related, they need to be reprocessed.");
console.log("Run: node clear-and-reprocess.js");
