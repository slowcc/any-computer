# Any Computer

A web-based application built with React, TypeScript, and Vite.

## Prerequisites

- Node.js >= 20

## Getting Started

1. Install dependencies:

```bash
yarn install
```

2. Start the development server:

```bash
yarn dev
```

The application will be available at `http://localhost:1420`

## Development

### Tech Stack

- React (Canary)
- TypeScript
- Vite
- TailwindCSS
- CodeMirror
- Zustand (State Management)
- TanStack Router & Query

### Project Structure

```
src/
├── components/ # React components
├── contexts/ # React contexts
├── hooks/ # Custom React hooks
├── pages/ # Page components
├── stores/ # Zustand stores
├── utils/ # Utility functions
├── themes/ # Theme configurations
├── types/ # TypeScript type definitions
├── App.tsx # Main application component
└── global.css # Global styles
```


### Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build

### Environment Setup

1. Configure your IDE to use TypeScript
2. Install recommended extensions (if using VSCode):
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense

### API Keys

The application requires a Gemini API key for certain functionalities. You can obtain one from:
https://aistudio.google.com/app/apikey

## Building for Production

1. Build the application:

```bash
yarn build
```

2. Preview the build:

```bash
yarn preview
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

MIT License

Copyright (c) 2024 Any Computer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
