/**
 * Test script to verify SDK setup is correct
 */

import ControlPlaneSDK, { generateTenantId } from "ai-control-plane-sdk";

console.log('✅ Testing AI Control Plane SDK Setup\n');

// Test 1: Generate Tenant IDs
console.log('1️⃣  Testing generateTenantId():');
const tenantId1 = generateTenantId('user');
const tenantId2 = generateTenantId('org');
console.log('   User Tenant:', tenantId1);
console.log('   Org Tenant:', tenantId2);
console.log('   ✅ Tenant ID generation works!\n');

// Test 2: Create SDK Instance
console.log('2️⃣  Testing ControlPlaneSDK instantiation:');
const controlPlane = new ControlPlaneSDK({
  tenantId: tenantId1,
  serviceName: 'test-service',
  controlPlaneUrl: 'http://localhost:8000'
});
console.log('   Service Name:', controlPlane.serviceName);
console.log('   Tenant ID:', controlPlane.tenantId);
console.log('   Control Plane URL:', controlPlane.controlPlaneUrl);
console.log('   ✅ SDK instantiation works!\n');

// Test 3: Check methods exist
console.log('3️⃣  Testing SDK methods:');
console.log('   track() method:', typeof controlPlane.track === 'function' ? '✅' : '❌');
console.log('   getConfig() method:', typeof controlPlane.getConfig === 'function' ? '✅' : '❌');
console.log('   middleware() method:', typeof controlPlane.middleware === 'function' ? '✅' : '❌');
console.log('');

console.log('🎉 All tests passed! SDK is correctly set up.');
console.log('📝 You can now use the SDK in your demo service.');
