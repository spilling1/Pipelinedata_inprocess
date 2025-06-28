import { Express } from 'express';
import comparativeRoutes from './routes-mktg-comparative.js';

/**
 * Register comparative analytics routes
 * Adds /api/marketing/comparative/* endpoints to the Express app
 */
export function registerComparativeRoutes(app: Express) {
  console.log('🔗 Registering marketing comparative analytics routes');
  
  try {
    // Mount comparative analytics routes under /api/marketing/comparative
    app.use('/api/marketing/comparative', comparativeRoutes);
    
    console.log('✅ Marketing comparative analytics routes registered successfully');
    console.log('🎯 Available endpoints:');
    console.log('   GET /api/marketing/comparative/target-accounts');
    console.log('   GET /api/marketing/comparative/attendee-effectiveness');
    console.log('   GET /api/marketing/comparative/campaign-comparison');
    console.log('   GET /api/marketing/comparative/strategic-matrix');
    console.log('   GET /api/marketing/comparative/campaign-types');
    console.log('   GET /api/marketing/comparative/dashboard-summary');
    
  } catch (error) {
    console.error('❌ Error registering marketing comparative analytics routes:', error);
    throw error;
  }
}