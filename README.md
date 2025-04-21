# constitutional-compass Development Guide

## Branch Rules  
- For each sprint, make a new branch and push all code to that
- At the end of the sprint, merge with `dev` branch  
- Never push directly to `main` unless triggering deployment to Azure
- Tests must pass before merging  

## Setup Commands  
- Install Node.js v18.20.4
- If you have v22 installed, just run `nvm use 18` in your terminal
- Clone the repo
- Cd into the repo
- Run   `npm install`

## Testing Rules  
- All tests go in `src/tests/`  
- Always run `npm test` locally first  
- Absolutely no `div` elements allowed  
- Fix all test failures before pushing  

## Team Rules  
- Discuss uncertainties in the group chat first  
- Verify tests pass before any push to `dev`  

## Backend Rules
- Add all backend code to the api folder so that Azure can detect it
- Tests for backend can go into the tests folder
