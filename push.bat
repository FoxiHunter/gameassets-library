@echo off
set /p msg=Введите коммит-сообщение: 
git add .
git commit -m "%msg%"
git push origin master --force
pause
