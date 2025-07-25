# Installation and Running Guide

## Local Setup

1. **Clone the repository**
    ```bash
    git clone https://github.com/anuwat365/pisa-service.git
    cd pisa-service
    ```

2. **Install dependencies**
    ```bash
    npm install
    ```
3. **Setup Index in Firebase firestore**
    - Refer to the following image for guidance on setting up the index in Firebase Firestore:

    ![Firebase Firestore Index Setup](./images/firebase_index.png)

4. **Configure environment variables**
    - Copy `.env.example` to `.env` and update values as needed.

5. **Run the service locally**
    ```bash
    npm run dev
    ```

## Additional Notes

- Ensure all required environment variables are set.
- For troubleshooting, check logs and documentation.