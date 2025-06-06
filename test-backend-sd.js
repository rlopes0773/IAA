import fetch from 'node-fetch'; // Pode ser necessário instalar: npm install node-fetch

async function testBackendSD() {
  console.log('🧪 Testing Backend Selective Disclosure...');
  
  try {
    const response = await fetch('http://localhost:3001/issue-sd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        credentialData: {
          "id": "did:example:student123",
          "http://schema.org/name": "João Silva",
          "http://example.org/degree": {
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": "http://example.org/BachelorDegree",
            "http://schema.org/name": "Bachelor of Computer Science",
            "http://example.org/university": "Universidade de Lisboa",
            "http://example.org/graduationDate": "2023-06-15"
          },
          "http://example.org/gpa": "3.8"
        },
        selectivePointers: [
          '/credentialSubject/http://schema.org/name',
          '/credentialSubject/http://example.org/gpa'
        ]
      })
    });
    
    const result = await response.json();
    
    console.log('✅ Backend SD Response:', result.success);
    
    if (result.success) {
      console.log('🎉 SUCCESS! Credential issued with Selective Disclosure');
      console.log('   Cryptosuite:', result.credential.proof.cryptosuite);
      console.log('   Selective Pointers:', result.selectivePointers);
      console.log('   Issuer DID:', result.issuerDid);
      console.log('   Verification Method:', result.metadata.verificationMethod);
      
      // Mostrar proof value parcial (está muito longo)
      const proofValue = result.credential.proof.proofValue;
      console.log('   Proof Value (partial):', proofValue.substring(0, 50) + '...');
      
      console.log('\n📄 Credential Structure:');
      console.log('   Context:', result.credential['@context']);
      console.log('   Type:', result.credential.type);
      console.log('   Credential Subject ID:', result.credential.credentialSubject.id);
      
    } else {
      console.error('❌ Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Network/Connection Error:', error.message);
    console.log('\n💡 Make sure the issuer service is running on port 3001');
    console.log('   Run: npm start (in another terminal)');
  }
}

// Executar teste
testBackendSD().catch(console.error);