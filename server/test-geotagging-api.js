import axios from 'axios';

async function testGeotaggingAPI() {
  try {
    console.log('Testing geotagging API endpoint...');
    
    // Test the geotagging documents endpoint
    const response = await axios.get('http://localhost:3000/api/geotagging/documents', {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Response Status:', response.status);
    console.log('📊 Documents with locations:', response.data.documents.length);
    console.log('📍 Total unique locations:', response.data.stats.totalLocations);
    console.log('🔥 Most active locations:', response.data.stats.mostActiveLocations.slice(0, 3));

    // Show sample documents
    console.log('\n📄 Sample documents with locations:');
    response.data.documents.slice(0, 3).forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.filename}`);
      console.log(`   📍 Places: ${doc.entities.places.join(', ')}`);
      console.log(`   🏢 Agency: ${doc.agency}`);
      console.log('');
    });

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Connection Error:', error.message);
    }
  }
}

testGeotaggingAPI();
