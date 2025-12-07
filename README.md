# Anemo Check AI

This is a Next.js application built in Firebase Studio. It is an AI-powered web application that helps detect possible signs of anemia through image and symptom analysis.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v20 or later recommended)
- [npm](https://www.npmjs.com/) (which comes with Node.js)

### Installation

1.  **Clone the repository** or download the source code.

2.  **Navigate to the project directory** in your terminal:
    ```bash
    cd your-project-directory
    ```

3.  **Install dependencies**:
    Run the following command to install all the packages listed in `package.json`.
    ```bash
    npm install
    ```

### Environment Variables

The application uses AI features that require an API key from Google AI Studio.

1.  Create a new file named `.env` in the root of your project.

2.  Add the following line to the `.env` file, replacing `YOUR_API_KEY` with your actual Gemini API key:
    ```
    GEMINI_API_KEY=YOUR_API_KEY
    ```
    You can get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Running the Application

Once you have installed the dependencies and set up your environment variables, you can run the application with the following command:

```bash
npm run dev
```

This will start the development server. You can view your application by opening your browser and navigating to [http://localhost:9002](http://localhost:9002).
