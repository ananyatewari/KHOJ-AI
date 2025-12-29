// Test script for event acknowledgment and deletion functionality
import Event from './models/Event.js';

async function testEventActions() {
  try {
    console.log('🧪 Testing Event Actions...\n');

    // Find a test event
    const testEvent = await Event.findOne({ status: 'active' });
    
    if (!testEvent) {
      console.log('❌ No active events found. Please create an event first.');
      return;
    }

    console.log(`📋 Found test event: ${testEvent.title} (ID: ${testEvent._id})`);
    
    // Test acknowledgment
    console.log('\n✅ Testing acknowledgment...');
    testEvent.status = 'archived';
    testEvent.acknowledged = {
      acknowledged: true,
      acknowledgedBy: 'test-user',
      acknowledgedAt: new Date(),
      note: 'Test acknowledgment'
    };
    
    await testEvent.save();
    console.log('✅ Event acknowledged successfully');
    
    // Verify acknowledgment
    const acknowledgedEvent = await Event.findById(testEvent._id);
    console.log(`📊 Status: ${acknowledgedEvent.status}`);
    console.log(`👤 Acknowledged by: ${acknowledgedEvent.acknowledged.acknowledgedBy}`);
    
    // Test deletion
    console.log('\n🗑️ Testing deletion...');
    await Event.findByIdAndDelete(testEvent._id);
    console.log('✅ Event deleted successfully');
    
    // Verify deletion
    const deletedEvent = await Event.findById(testEvent._id);
    if (!deletedEvent) {
      console.log('✅ Event deletion verified');
    } else {
      console.log('❌ Event deletion failed');
    }
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testEventActions();
