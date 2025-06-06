import { sdIssuer } from './src/issuer/sdIssuer.js';

async function testSDIssuer() {
  console.log('🧪 Testing SD Issuer...\n');

  try {
    // 1. Inicializar issuer
    console.log('1. Inicializando issuer...');
    const issuerInfo = await sdIssuer.initialize();
    console.log('✅ Issuer inicializado:', issuerInfo);

    // 2. Listar templates disponíveis
    console.log('\n2. Templates disponíveis:');
    const templates = sdIssuer.getAvailableTemplates();
    templates.forEach(template => {
      console.log(`   - ${template.id}: ${template.type}`);
      console.log(`     Campos seletivos: ${template.selectiveFields.join(', ')}`);
    });

    // 3. Emitir diploma universitário
    console.log('\n3. Emitindo diploma universitário...');
    const diplomaData = {
      subjectId: "did:example:joao-silva",
      name: "João Silva",
      degree: {
        type: "BachelorDegree",
        name: "Licenciatura em Ciência da Computação",
        university: "Universidade de Lisboa",
        graduationDate: "2023-06-15"
      },
      gpa: "17.5"
    };

    const diplomaResult = await sdIssuer.issueCredential('UniversityDegree', diplomaData);
    console.log('✅ Diploma emitido:', diplomaResult.credentialId);
    console.log('   Campos seletivos:', diplomaResult.selectiveFields);

    // 4. Emitir certificado profissional
    console.log('\n4. Emitindo certificado profissional...');
    const certData = {
      subjectId: "did:example:maria-santos",
      name: "Maria Santos",
      certification: {
        type: "ProfessionalCertificate",
        name: "AWS Solutions Architect",
        authority: "Amazon Web Services",
        certificationDate: "2023-03-10",
        expirationDate: "2026-03-10"
      }
    };

    const certResult = await sdIssuer.issueCredential('ProfessionalCertificate', certData);
    console.log('✅ Certificado emitido:', certResult.credentialId);

    // 5. Verificar credenciais
    console.log('\n5. Verificando credenciais...');
    const diplomaVerification = await sdIssuer.verifyCredential(diplomaResult.credential);
    const certVerification = await sdIssuer.verifyCredential(certResult.credential);
    
    console.log('   Diploma verificado:', diplomaVerification.verified);
    console.log('   Certificado verificado:', certVerification.verified);

    // 6. Listar credenciais emitidas
    console.log('\n6. Credenciais emitidas:');
    const issuedCredentials = sdIssuer.listIssuedCredentials();
    issuedCredentials.forEach(cred => {
      console.log(`   - ${cred.id}`);
      console.log(`     Template: ${cred.templateId}`);
      console.log(`     Subject: ${cred.subjectId}`);
      console.log(`     Emitido em: ${cred.issuedAt}`);
    });

    // 7. Informações do issuer
    console.log('\n7. Informações do issuer:');
    const info = sdIssuer.getIssuerInfo();
    console.log(`   Nome: ${info.name}`);
    console.log(`   DID: ${info.did}`);
    console.log(`   Credenciais emitidas: ${info.credentialsIssued}`);

    return {
      success: true,
      issuedCredentials: issuedCredentials.length,
      verifications: {
        diploma: diplomaVerification.verified,
        certificate: certVerification.verified
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
testSDIssuer().then(result => {
  if (result.success) {
    console.log('\n🎉 SD Issuer is working correctly!');
    console.log(`   Credenciais emitidas: ${result.issuedCredentials}`);
    console.log(`   Verificações: diploma=${result.verifications.diploma}, cert=${result.verifications.certificate}`);
  } else {
    console.log('\n💥 SD Issuer test failed:', result.error);
  }
}).catch(console.error);