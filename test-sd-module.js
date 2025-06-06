import { sdService } from './src/shared/selectiveDisclosure.js';

async function testSDModule() {
  console.log('🧪 Testing SD Module...\n');

  try {
    // 1. Gerar chaves
    const keyPair = await sdService.generateKeyPair();

    // 2. Dados da credencial (formato simples)
    const credentialData = {
      id: "did:example:student123",
      name: "João Silva",
      degree: {
        type: "BachelorDegree",
        name: "Bachelor of Computer Science",
        university: "Universidade de Lisboa",
        graduationDate: "2023-06-15"
      },
      gpa: "3.8"
    };

    // 3. Definir campos para selective disclosure
    const selectiveFields = ['name', 'gpa', 'university'];
    const selectivePointers = sdService.generateSelectivePointers(selectiveFields);

    console.log('📋 Selective Pointers:', selectivePointers);

    // 4. Emitir credencial com SD
    const result = await sdService.issueCredentialWithSD(credentialData, keyPair, {
      selectivePointers
    });

    console.log('\n✅ Credential issued successfully!');
    console.log('   Issuer DID:', result.issuerDid);
    console.log('   Cryptosuite:', result.credential.proof.cryptosuite);

    // 5. Verificar credencial
    const verifyResult = await sdService.verifyCredentialWithSD(result.credential);

    console.log('\n🎉 Test completed!');
    console.log('   Verified:', verifyResult.verified);

    return {
      success: true,
      verified: verifyResult.verified,
      credential: result.credential
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar teste
testSDModule().then(result => {
  if (result.success) {
    console.log('\n🎉 SD Module is working correctly!');
  } else {
    console.log('\n💥 SD Module test failed:', result.error);
  }
}).catch(console.error);