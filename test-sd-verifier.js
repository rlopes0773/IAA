import { sdIssuer } from './src/issuer/sdIssuer.js';
import { sdHolder } from './src/holder/sdHolder.js';
import { sdVerifier } from './src/verifier/sdVerifier.js';

async function testSDVerifier() {
  console.log('🧪 Testing SD Verifier...\n');

  try {
    // 1. Inicializar todos os serviços
    console.log('1. Inicializando serviços...');
    await sdIssuer.initialize();
    const holderInfo = await sdHolder.initialize();
    const verifierInfo = await sdVerifier.initialize();
    
    console.log('✅ Issuer, Holder e Verifier inicializados');
    console.log('   Verifier DID:', verifierInfo.did);

    // 2. Adicionar issuer como confiável
    console.log('\n2. Configurando issuer confiável...');
    sdVerifier.addTrustedIssuer(sdIssuer.getIssuerInfo().did, {
      name: 'Universidade Digital',
      type: 'educational-institution'
    });

    // 3. Emitir credencial
    console.log('\n3. Emitindo credencial...');
    const diplomaData = {
      subjectId: holderInfo.did,
      name: "Carlos Mendes",
      degree: {
        type: "BachelorDegree",
        name: "Licenciatura em Engenharia Informática",
        university: "Universidade do Porto",
        graduationDate: "2023-09-20"
      },
      gpa: "16.8"
    };

    const diplomaResult = await sdIssuer.issueCredential('UniversityDegree', diplomaData);
    console.log('✅ Credencial emitida:', diplomaResult.credentialId);

    // 4. Holder recebe credencial
    console.log('\n4. Holder recebendo credencial...');
    const receivedId = await sdHolder.receiveCredential(diplomaResult.credential);

    // 5. Listar templates de requisição
    console.log('\n5. Templates de requisição disponíveis:');
    const templates = sdVerifier.getRequestTemplates();
    templates.forEach(template => {
      console.log(`   - ${template.id}: ${template.name}`);
      console.log(`     Campos obrigatórios: ${template.requiredFields.join(', ')}`);
      console.log(`     Campos opcionais: ${template.optionalFields.join(', ')}`);
    });

    // 6. Criar requisição para emprego (sem notas)
    console.log('\n6. Criando requisição para verificação de emprego...');
    const employmentRequest = sdVerifier.createPresentationRequest('employment-verification', {
      domain: 'empresa-xyz.com',
      constraints: {
        purpose: 'Verificação de qualificações para emprego'
      }
    });
    console.log('✅ Requisição criada:', employmentRequest.id);

    // 7. Holder cria apresentação conforme requisição
    console.log('\n7. Criando apresentação para emprego (ocultando notas)...');
    const employmentPresentation = await sdHolder.createPresentation({
      credentialId: receivedId,
      revealFields: ['name', 'degree', 'university'],
      hideFields: ['gpa', 'graduationDate'], // Ocultar notas e data
      challenge: employmentRequest.challenge,
      domain: employmentRequest.domain
    });

    // 8. Verifier analisa apresentação
    console.log('\n8. Verificando apresentação para emprego...');
    const employmentVerification = await sdVerifier.verifyPresentation(
      employmentPresentation.presentation,
      employmentRequest
    );

    console.log('✅ Verificação completa:');
    console.log('   Verificada:', employmentVerification.verified);
    console.log('   Campos revelados:', employmentVerification.analysis.revealedFields);
    console.log('   Campos ocultos:', employmentVerification.analysis.hiddenFields);
    console.log('   Nível de privacidade:', employmentVerification.analysis.privacyLevel);
    console.log('   Nível de conformidade:', employmentVerification.analysis.complianceLevel);

    // 9. Criar requisição completa
    console.log('\n9. Criando requisição para verificação completa...');
    const fullRequest = sdVerifier.createPresentationRequest('full-degree-verification');

    // 10. Holder cria apresentação completa
    console.log('\n10. Criando apresentação completa...');
    const fullPresentation = await sdHolder.createPresentation({
      credentialId: receivedId,
      revealFields: ['name', 'degree', 'university', 'graduationDate', 'gpa'],
      hideFields: [],
      challenge: fullRequest.challenge,
      domain: fullRequest.domain
    });

    // 11. Verifier analisa apresentação completa
    console.log('\n11. Verificando apresentação completa...');
    const fullVerification = await sdVerifier.verifyPresentation(
      fullPresentation.presentation,
      fullRequest
    );

    console.log('✅ Verificação completa:');
    console.log('   Verificada:', fullVerification.verified);
    console.log('   Campos revelados:', fullVerification.analysis.revealedFields);
    console.log('   Campos ocultos:', fullVerification.analysis.hiddenFields);
    console.log('   Nível de privacidade:', fullVerification.analysis.privacyLevel);
    console.log('   Nível de conformidade:', fullVerification.analysis.complianceLevel);

    // 12. Comparar apresentações
    console.log('\n12. Comparação de apresentações:');
    console.log('   Emprego - Privacidade:', employmentVerification.analysis.privacyLevel, '| Conformidade:', employmentVerification.analysis.complianceLevel);
    console.log('   Completa - Privacidade:', fullVerification.analysis.privacyLevel, '| Conformidade:', fullVerification.analysis.complianceLevel);

    // 13. Histórico de verificações
    console.log('\n13. Histórico de verificações:');
    const history = sdVerifier.getVerificationHistory();
    history.forEach(verification => {
      console.log(`   - ${verification.id}`);
      console.log(`     Verificada: ${verification.verified}`);
      console.log(`     Revelados: ${verification.revealedFieldsCount} | Ocultos: ${verification.hiddenFieldsCount}`);
      console.log(`     Privacidade: ${verification.privacyLevel}`);
    });

    // 14. Estatísticas do verifier
    console.log('\n14. Estatísticas do verifier:');
    const verifierStats = sdVerifier.getVerifierInfo();
    console.log(`   DID: ${verifierStats.did}`);
    console.log(`   Templates: ${verifierStats.requestTemplates}`);
    console.log(`   Verificações: ${verifierStats.verificationsPerformed}`);
    console.log(`   Issuers confiáveis: ${verifierStats.trustedIssuers}`);

    return {
      success: true,
      verificationsPerformed: verifierStats.verificationsPerformed,
      templatesAvailable: verifierStats.requestTemplates,
      employmentVerified: employmentVerification.verified,
      fullVerified: fullVerification.verified,
      privacyComparison: {
        employment: employmentVerification.analysis.privacyLevel,
        full: fullVerification.analysis.privacyLevel
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
testSDVerifier().then(result => {
  if (result.success) {
    console.log('\n🎉 SD Verifier is working correctly!');
    console.log(`   Verificações realizadas: ${result.verificationsPerformed}`);
    console.log(`   Templates disponíveis: ${result.templatesAvailable}`);
    console.log(`   Verificação emprego: ${result.employmentVerified}`);
    console.log(`   Verificação completa: ${result.fullVerified}`);
    console.log(`   Privacidade - Emprego: ${result.privacyComparison.employment} | Completa: ${result.privacyComparison.full}`);
  } else {
    console.log('\n💥 SD Verifier test failed:', result.error);
  }
}).catch(console.error);