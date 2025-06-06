import { sdIssuer } from './src/issuer/sdIssuer.js';
import { sdHolder } from './src/holder/sdHolder.js';

async function testSDHolder() {
  console.log('🧪 Testing SD Holder...\n');

  try {
    // 1. Inicializar serviços
    console.log('1. Inicializando serviços...');
    await sdIssuer.initialize();
    const holderInfo = await sdHolder.initialize();
    console.log('✅ Holder inicializado:', holderInfo.did);

    // 2. Issuer emite uma credencial
    console.log('\n2. Emitindo credencial...');
    const diplomaData = {
      subjectId: holderInfo.did, // Credencial para o holder
      name: "Ana Costa",
      degree: {
        type: "MasterDegree",
        name: "Mestrado em Inteligência Artificial",
        university: "Instituto Superior Técnico",
        graduationDate: "2024-07-15"
      },
      gpa: "18.2"
    };

    const diplomaResult = await sdIssuer.issueCredential('UniversityDegree', diplomaData);
    console.log('✅ Credencial emitida:', diplomaResult.credentialId);

    // 3. Holder recebe a credencial
    console.log('\n3. Recebendo credencial...');
    const receivedId = await sdHolder.receiveCredential(diplomaResult.credential, {
      issuerName: 'Instituto Superior Técnico',
      credentialType: 'Diploma'
    });
    console.log('✅ Credencial recebida e armazenada:', receivedId);

    // 4. Listar credenciais do holder
    console.log('\n4. Credenciais armazenadas:');
    const credentials = sdHolder.listCredentials();
    credentials.forEach(cred => {
      console.log(`   - ${cred.id}`);
      console.log(`     Tipo: ${cred.type.join(', ')}`);
      console.log(`     Issuer: ${cred.issuer}`);
      console.log(`     Campos seletivos: ${cred.selectiveFields.join(', ')}`);
    });

    // 5. Criar apresentação completa (todos os campos)
    console.log('\n5. Criando apresentação completa...');
    const fullPresentation = await sdHolder.createPresentation({
      credentialId: receivedId,
      revealFields: ['name', 'degree', 'university', 'graduationDate', 'gpa'],
      hideFields: []
    });
    console.log('✅ Apresentação completa criada:', fullPresentation.presentationId);

    // 6. Criar apresentação com campos ocultos
    console.log('\n6. Criando apresentação com selective disclosure...');
    const selectivePresentation = await sdHolder.createPresentation({
      credentialId: receivedId,
      revealFields: ['name', 'degree'],
      hideFields: ['gpa', 'graduationDate'], // Ocultar nota e data
      challenge: 'presentation-challenge-123',
      domain: 'verifier.example.com'
    });
    console.log('✅ Apresentação seletiva criada:', selectivePresentation.presentationId);
    console.log('   Campos revelados:', selectivePresentation.revealedFields);
    console.log('   Campos ocultos:', selectivePresentation.hiddenFields);

    // 7. Mostrar diferença entre apresentações
    console.log('\n7. Comparando apresentações:');
    console.log('   Apresentação completa - Subject:');
    console.log('   ', JSON.stringify(fullPresentation.presentation.verifiableCredential[0].credentialSubject, null, 2));
    
    console.log('\n   Apresentação seletiva - Subject:');
    console.log('   ', JSON.stringify(selectivePresentation.presentation.verifiableCredential[0].credentialSubject, null, 2));

    // 8. Verificar apresentações
    console.log('\n8. Verificando apresentações...');
    const fullVerification = await sdHolder.verifyPresentation(fullPresentation.presentation);
    const selectiveVerification = await sdHolder.verifyPresentation(selectivePresentation.presentation);
    
    console.log('   Apresentação completa verificada:', fullVerification.verified);
    console.log('   Apresentação seletiva verificada:', selectiveVerification.verified);

    // 9. Estatísticas do holder
    console.log('\n9. Informações do holder:');
    const info = sdHolder.getHolderInfo();
    console.log(`   DID: ${info.did}`);
    console.log(`   Credenciais: ${info.credentialsStored}`);
    console.log(`   Apresentações: ${info.presentationsCreated}`);

    return {
      success: true,
      credentialsReceived: info.credentialsStored,
      presentationsCreated: info.presentationsCreated,
      verificationsResults: {
        full: fullVerification.verified,
        selective: selectiveVerification.verified
      }
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar teste
testSDHolder().then(result => {
  if (result.success) {
    console.log('\n🎉 SD Holder is working correctly!');
    console.log(`   Credenciais recebidas: ${result.credentialsReceived}`);
    console.log(`   Apresentações criadas: ${result.presentationsCreated}`);
    console.log(`   Verificações: full=${result.verificationsResults.full}, selective=${result.verificationsResults.selective}`);
  } else {
    console.log('\n💥 SD Holder test failed:', result.error);
  }
}).catch(console.error);