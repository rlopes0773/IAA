#!/bin/bash
echo "=== VC Demo - Teste Completo ==="

BASE_URL="http://localhost:3000"

echo "1. Criando credencial verificável..."
CREDENTIAL_RESPONSE=$(curl -s -X POST $BASE_URL/issue \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "did:example:student123", 
    "type": "UniversityDegree",
    "degree": "Bachelor of Science",
    "university": "Example University"
  }')

echo "Credencial criada:"
echo "$CREDENTIAL_RESPONSE" | jq .
echo ""

echo "2. Criando apresentação verificável..."
PRESENTATION_RESPONSE=$(curl -s -X POST $BASE_URL/present \
  -H "Content-Type: application/json" \
  -d "{\"credential\": $CREDENTIAL_RESPONSE, \"challenge\": \"test-challenge-123\"}")

echo "Apresentação criada:"
echo "$PRESENTATION_RESPONSE" | jq .
echo ""

echo "3. Verificando apresentação..."
VERIFICATION_RESPONSE=$(curl -s -X POST $BASE_URL/verify \
  -H "Content-Type: application/json" \
  -d "{\"presentation\": $PRESENTATION_RESPONSE}")

echo "Resultado da verificação:"
echo "$VERIFICATION_RESPONSE" | jq .
echo ""

# Extrair o ID da apresentação para teste de revogação
PRESENTATION_ID=$(echo "$PRESENTATION_RESPONSE" | jq -r '.id')

echo "4. Revogando apresentação (ID: $PRESENTATION_ID)..."
REVOCATION_RESPONSE=$(curl -s -X POST $BASE_URL/revoke \
  -H "Content-Type: application/json" \
  -d "{\"presentationId\": \"$PRESENTATION_ID\"}")

echo "Resultado da revogação:"
echo "$REVOCATION_RESPONSE" | jq .
echo ""

echo "5. Verificando status de revogação..."
REVOCATION_STATUS=$(curl -s "$BASE_URL/check-revocation?id=$PRESENTATION_ID")
echo "Status de revogação:"
echo "$REVOCATION_STATUS" | jq .
echo ""

echo "6. Verificando apresentação novamente (deve mostrar como revogada)..."
VERIFICATION_AFTER_REVOCATION=$(curl -s -X POST $BASE_URL/verify \
  -H "Content-Type: application/json" \
  -d "{\"presentation\": $PRESENTATION_RESPONSE}")

echo "Resultado da verificação após revogação:"
echo "$VERIFICATION_AFTER_REVOCATION" | jq .
echo ""

echo "=== Teste concluído ==="