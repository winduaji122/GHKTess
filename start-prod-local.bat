@echo off
echo Building and starting frontend in production mode locally...
echo Frontend will be available at: http://localhost:5173

npm run build:prod-local && npm run preview:prod-local

pause
