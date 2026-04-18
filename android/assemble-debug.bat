@echo off
setlocal
if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
)
cd /d "%~dp0"
call gradlew.bat assembleDebug
exit /b %ERRORLEVEL%
