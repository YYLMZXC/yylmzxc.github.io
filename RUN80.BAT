@echo off
cls
echo ====================================

echo server: https://localhost:80

echo.

echo ====================================
echo.


php -S localhost:80 -t . -d ssl.cafile=c:\Users\YYLMZXC\Desktop\key\example.crt -d ssl.private_key_file=c:\Users\YYLMZXC\Desktop\key\example.key


echo.
echo ====================================
.
echo ====================================
pause >nul