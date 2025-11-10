# Fever Forecaster Hub

Fever Forecaster Hub is a web application designed to help healthcare professionals monitor patients, assess their risk of fever, and manage alerts. It provides a centralized dashboard to visualize patient data and track potential health issues.

## Features

- **Dashboard**: View an overview of all patients and their current status.
- **Patient Risk**: Analyze the risk of fever for individual patients based on their data.
- **Alerts**: Manage and track alerts for patients who may be at high risk.
- **Responsive Design**: The application is designed to work on various screen sizes.

## Technologies Used

- **Vite**: A fast build tool for modern web projects.
- **React**: A JavaScript library for building user interfaces.
- **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **shadcn/ui**: A collection of re-usable components for React.
- **React Router**: For routing and navigation within the application.
- **Supabase**: Used for backend services, including database and authentication.

## Architecture

The application follows a client-server architecture:

- **Frontend**: A single-page application (SPA) built with React, TypeScript, and Vite. It utilizes Tailwind CSS and shadcn/ui for styling and components, and React Router for client-side navigation.
- **Backend/Database**: Supabase provides the backend services, including a PostgreSQL database for data storage, authentication for user management, and real-time APIs for data interaction.

```mermaid
graph TD
    A[User] --> B{React Frontend (SPA)};
    B --> C{Supabase Backend};
    C --> D[PostgreSQL Database];
    C --> E[Authentication];
    C --> F[Real-time APIs];
    D --> C;
    E --> C;
    F --> C;
    C --> B;
    B --> A;

    subgraph "Browser"
        B
    end

    subgraph "Supabase Cloud"
        C
        D
        E
        F
    end
```

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js and npm (we recommend using [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to manage Node.js versions)

### Installation

1. Clone the repo
   ```sh
   git clone <YOUR_GIT_URL>
   ```
2. Navigate to the project directory
   ```sh
   cd fever-forecaster-hub
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Start the development server
   ```sh
   npm run dev
   ```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).
