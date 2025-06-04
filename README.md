# VC Demo Project

This project is a demonstration of a Verifiable Credential (VC) system that allows for the creation, issuance, presentation, verification, and revocation of verifiable credentials and presentations. The system is designed to be interactive, showcasing the roles of the issuer, holder, verifier, and revocation entity.

## Project Structure

```
vc-demo-project
├── src
│   ├── app.ts                # Entry point of the application
│   ├── issuer
│   │   ├── index.ts          # Issuer class for creating and issuing VCs
│   │   └── credentials.ts    # Credential class representing a verifiable credential
│   ├── holder
│   │   ├── index.ts          # Holder class for creating verifiable presentations
│   │   └── presentation.ts    # Presentation class representing a verifiable presentation
│   ├── verifier
│   │   ├── index.ts          # Verifier class for verifying presentations
│   │   └── verification.ts    # Verification class for checking VPs and revocation status
│   ├── revocation
│   │   ├── index.ts          # RevocationRegistry class for managing revocation
│   │   └── registry.ts       # Revocation class for adding and checking revoked VPs
│   ├── types
│   │   └── index.ts          # Type definitions for Credential, Presentation, and RevocationStatus
│   └── utils
│       └── crypto.ts         # Utility functions for cryptographic operations
├── package.json               # npm configuration file
├── tsconfig.json              # TypeScript configuration file
└── README.md                  # Project documentation
```

## Features

- **Issuer**: Create and issue verifiable credentials.
- **Holder**: Create verifiable presentations from issued credentials.
- **Verifier**: Verify the authenticity of verifiable presentations and check their revocation status.
- **Revocation**: Manage the revocation of verifiable presentations.

## Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/vc-demo-project.git
   cd vc-demo-project
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Compile the TypeScript files:
   ```
   npm run build
   ```

4. Run the application:
   ```
   npm start
   ```

## Usage Examples

- **Issuing a Credential**: Use the Issuer class to create and issue a new verifiable credential.
- **Creating a Presentation**: Use the Holder class to generate a verifiable presentation from the issued credentials.
- **Verifying a Presentation**: Use the Verifier class to check the authenticity of the presentation and its revocation status.
- **Revoking a Presentation**: Use the RevocationRegistry class to revoke a presentation and check its status.

## Contributing

Feel free to submit issues or pull requests to improve the project. Your contributions are welcome!