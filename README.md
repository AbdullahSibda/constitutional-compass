# constitutional-compass Development Guide

## Branch Rules  
- All pushes must go to `dev` branch  
- Never push directly to `main`  
- Tests must pass before merging  

## Setup Commands  
- Install Node.js v22  
- Run these in order:
  `npm install` 
  `npm install react@latest react-dom@latest @testing-library/react@latest`   
  `npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom`
  `npm install --save-dev @babel/preset-env @babel/preset-react babel-jest` 
  `npm install --save-dev @testing-library/react@14 jest@29 babel-jest@29 @babel/preset-react@7 --legacy-peer-deps`   

## Testing Rules  
- All tests go in `src/tests/`  
- Always run `npm test` locally first  
- Absolutely no `div` elements allowed  
- Fix all test failures before pushing  

## Team Rules  
- Discuss uncertainties in group chat first  
- Verify tests pass before any push to `dev`  

## Backend Rules
- Add all backend code to the api folder so that Azure can detect it
- Tests for backend can go into the tests folder
