# Anemo Check AI

This is a Next.js application built with Firebase Studio that uses AI to perform preliminary anemia analysis. It features image analysis, a diagnostic chatbot, and tools to find nearby healthcare providers.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js**: Version 18.x or higher. You can download it from [nodejs.org](https://nodejs.org/).
*   **Git**: Required for cloning the repository. You can download it from [git-scm.com](https://git-scm.com/).
*   **A code editor**: [Visual Studio Code](https://code.visualstudio.com/) is recommended.

### Local Setup Instructions

Follow these steps to set up your local development environment.

1.  **Clone the Repository**

    Open your terminal, navigate to the directory where you want to store the project, and clone the GitHub repository:

    ```bash
    git clone https://github.com/quinoviva/anemo-check-ai.git
    cd anemo-check-ai
    ```

2.  **Install Dependencies**

    Once inside the project directory, install all the required `npm` packages. This command reads the `package.json` file and downloads everything needed to run the app.

    ```bash
    npm install
    ```

3.  **Set Up Environment Variables**

    The application uses Google's Gemini for its AI features, which requires an API key.

    *   Create a new file named `.env` in the root of your project directory.
    *   Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to generate a Gemini API key.
    *   Add the following line to your `.env` file, replacing `YOUR_API_KEY` with the key you just generated:

    ```env
    GEMINI_API_KEY=YOUR_API_KEY
    ```

    > **Note**: The `.env` file is included in `.gitignore` by default to prevent you from accidentally committing your secret keys.

### Running the Application

This project consists of two main parts that need to run simultaneously in separate terminals: the **Next.js frontend** and the **Genkit AI backend**.

1.  **Run the Next.js Development Server**

    In your first terminal, start the Next.js web application:

    ```bash
    npm run dev
    ```

    This will start the frontend on [http://localhost:9002](http://localhost:9002).

2.  **Run the Genkit AI Development Server**

    Genkit serves the AI models and flows. Open a **second terminal** in the same project directory and run the following command:

    ```bash
    npm run genkit:dev
    ```

    Alternatively, if you want the Genkit server to automatically restart when you make changes to AI flows, use:

    ```bash
    npm run genkit:watch
    ```

    The Genkit UI will be available at [http://localhost:4000](http://localhost:4000) for inspecting flows and tools.

You should now have the application fully running locally! Open [http://localhost:9002](http://localhost:9002) in your browser to see the app.


    Cyril Quinoviva
    owner
