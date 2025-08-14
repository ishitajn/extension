@echo off
title Create Bumble Wingman AI Icons

echo.
echo =================================================
echo      Bumble Wingman AI - Icon Generator
echo =================================================
echo.

REM Check if the icons directory exists, if not, create it.
if not exist "icons" (
    echo Creating 'icons' directory...
    mkdir "icons"
) else (
    echo 'icons' directory already exists.
)
echo.

echo --- Generating Original Icons ---

echo Creating star.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"^>^<path d="M10 2.5L11.75 7.8125H17.5L12.875 11.0625L14.625 16.375L10 13.125L5.375 16.375L7.125 11.0625L2.5 7.8125H8.25L10 2.5Z" fill="black"/^>^</svg^>) > "icons\star.svg"

echo Creating settings.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"^>^<path d="M16.6667 7.49984V9.1665C16.6667 9.62673 16.578 10.081 16.4082 10.4998L17.9917 11.6665C18.1583 11.7915 18.2083 12.0165 18.1167 12.2082L16.45 15.1248C16.3583 15.3165 16.125 15.3832 15.9417 15.2832L14.0583 14.2498C13.5417 14.6165 12.9667 14.9082 12.3417 15.1082L12.0083 17.0998C11.9833 17.2498 11.8583 17.4998 11.6667 17.4998H8.33333C8.15 17.4998 8.01667 17.2498 7.99167 17.0998L7.65833 15.1082C7.03333 14.9082 6.45833 14.6165 5.94167 14.2498L4.05833 15.2832C3.875 15.3832 3.64167 15.3082 3.55 15.1248L1.88333 12.2082C1.79167 12.0165 1.84167 11.7915 2.00833 11.6665L3.59167 10.4998C3.42187 10.081 3.33333 9.62673 3.33333 9.1665V7.49984C3.33333 7.0396 3.42187 6.58536 3.59167 6.1665L2.00833 4.99984C1.84167 4.87484 1.79167 4.64984 1.88333 4.45817L3.55 1.5415C3.64167 1.34984 3.875 1.28317 4.05833 1.38317L5.94167 2.4165C6.45833 2.04984 7.03333 1.75817 7.65833 1.55817L7.99167 -0.433497C8.01667 -0.583497 8.15 -0.833497 8.33333 -0.833497H11.6667C11.85 -0.833497 11.9833 -0.583497 12.0083 -0.433497L12.3417 1.55817C12.9667 1.75817 13.5417 2.04984 14.0583 2.4165L15.9417 1.38317C16.125 1.28317 16.3583 1.35817 16.45 1.5415L18.1167 4.45817C18.2083 4.64984 18.1583 4.87484 17.9917 4.99984L16.4082 6.1665C16.578 6.58536 16.6667 7.0396 16.6667 7.49984ZM10 12.5C11.8417 12.5 13.3333 10.9915 13.3333 9.1665C13.3333 7.3415 11.8417 5.83317 10 5.83317C8.15833 5.83317 6.66667 7.3415 6.66667 9.1665C6.66667 10.9915 8.15833 12.5 10 12.5Z" fill="black"/^>^</svg^>) > "icons\settings.svg"

echo Creating pencil.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"^>^<path d="M2.6665 11.3332V13.3332H4.6665L11.2998 6.6998L9.29984 4.6998L2.6665 11.3332ZM13.1332 4.86646C13.3332 4.66646 13.3332 4.34646 13.1332 4.14646L11.8532 2.86646C11.6532 2.66646 11.3332 2.66646 11.1332 2.86646L10.1998 3.7998L12.1998 5.7998L13.1332 4.86646Z" fill="black"/^>^</svg^>) > "icons\pencil.svg"

echo Creating copy.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"^>^<path d="M11.3332 2H3.99984C3.2665 2 2.6665 2.6 2.6665 3.33333V11.3333H3.99984V3.33333H11.3332V2ZM12.6665 4H6.6665C5.93317 4 5.33317 4.6 5.33317 5.33333V13.3333C5.33317 14.0667 5.93317 14.6667 6.6665 14.6667H12.6665C13.3998 14.6667 13.9998 14.0667 13.9998 13.3333V5.33333C13.9998 4.6 13.3998 4 12.6665 4Z" fill="black"/^>^</svg^>) > "icons\copy.svg"

echo Creating generate.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"^>^<path d="M8 1.33317L9.16667 5.20817H13.3333L9.91667 7.8665L11.0833 11.7415L8 9.08317L4.91667 11.7415L6.08333 7.8665L2.66667 5.20817H6.83333L8 1.33317Z" fill="black"/^>^</svg^>) > "icons\generate.svg"

echo Creating cancel.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"^>^<path d="M15 5L5 15" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/^>^<path d="M5 5L15 15" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/^>^</svg^>) > "icons\cancel.svg"

echo Creating chevron-down.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"^>^<path d="M5 7.5L10 12.5L15 7.5" stroke="black" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"/^>^</svg^>) > "icons\chevron-down.svg"

echo Creating location.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"^>^<path d="M7.99984 8.6665C9.11984 8.6665 9.99984 7.7865 9.99984 6.6665C9.99984 5.5465 9.11984 4.6665 7.99984 4.6665C6.87984 4.6665 5.99984 5.5465 5.99984 6.6665C5.99984 7.7865 6.87984 8.6665 7.99984 8.6665ZM7.99984 1.33317C5.33317 1.33317 2.6665 4.15317 2.6665 6.6665C2.6665 9.81317 7.99984 14.6665 7.99984 14.6665C7.99984 14.6665 13.3332 9.81317 13.3332 6.6665C13.3332 4.15317 10.6665 1.33317 7.99984 1.33317Z" fill="black"/^>^</svg^>) > "icons\location.svg"

echo Creating arrow-left.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"^>^<path d="M12.5 15L7.5 10L12.5 5" stroke="black" stroke-width="1.67" stroke-linecap="round" stroke-linejoin="round"/^>^</svg^>) > "icons\arrow-left.svg"

echo Creating check-circle.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"^>^<path d="M13.3332 8.00004C13.3332 11.68 10.3465 14.6667 6.6665 14.6667C2.9865 14.6667 -0.000162125 11.68 -0.000162125 8.00004C-0.000162125 4.32004 2.9865 1.33337 6.6665 1.33337C10.3465 1.33337 13.3332 4.32004 13.3332 8.00004ZM6.41984 10.3334L10.6132 6.14004L9.6665 5.19337L6.41984 8.44004L4.69317 6.71337L3.7465 7.66004L6.41984 10.3334Z" fill="black"/^>^</svg^>) > "icons\check-circle.svg"

echo Creating plus.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"^>^<path d="M8 3.33331V12.6666" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/^>^<path d="M3.33337 8H12.6667" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/^>^</svg^>) > "icons\plus.svg"

echo Creating trash.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"^>^<path d="M2.66663 4.00002H3.99996H13.3333" stroke="black" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/^>^<path d="M5.33337 3.99998V2.66665C5.33337 2.31303 5.47385 1.9739 5.72389 1.72386C5.97393 1.47382 6.31309 1.33331 6.66671 1.33331H9.33337C9.68699 1.33331 10.0261 1.47382 10.2762 1.72386C10.5262 1.9739 10.6667 2.31303 10.6667 2.66665V3.99998M12 3.99998V13.3333C12 13.6869 11.8595 14.0261 11.6095 14.2761C11.3594 14.5262 11.0203 14.6666 10.6667 14.6666H5.33337C4.97975 14.6666 4.64059 14.5262 4.39054 14.2761C4.1405 14.0261 4.00004 13.6869 4.00004 13.3333V3.99998H12Z" stroke="black" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/^>^</svg^>) > "icons\trash.svg"
echo.

echo --- Generating Additional Icons for Future Use ---

echo Creating alert-triangle.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/^>^<line x1="12" y1="9" x2="12" y2="13"/^>^<line x1="12" y1="17" x2="12.01" y2="17"/^>^</svg^>) > "icons\alert-triangle.svg"

echo Creating arrow-right.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<line x1="5" y1="12" x2="19" y2="12"/^>^<polyline points="12 5 19 12 12 19"/^>^</svg^>) > "icons\arrow-right.svg"

echo Creating at-sign.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<circle cx="12" cy="12" r="4"/^>^<path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/^>^</svg^>) > "icons\at-sign.svg"

echo Creating bar-chart.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<line x1="12" y1="20" x2="12" y2="10"/^>^<line x1="18" y1="20" x2="18" y2="4"/^>^<line x1="6" y1="20" x2="6" y2="16"/^>^</svg^>) > "icons\bar-chart.svg"

echo Creating bell.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/^>^<path d="M13.73 21a2 2 0 0 1-3.46 0"/^>^</svg^>) > "icons\bell.svg"

echo Creating book-open.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/^>^<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/^>^</svg^>) > "icons\book-open.svg"

echo Creating box.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/^>^<polyline points="3.27 6.96 12 12.01 20.73 6.96"/^>^<line x1="12" y1="22.08" x2="12" y2="12"/^>^</svg^>) > "icons\box.svg"

echo Creating calendar.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/^>^<line x1="16" y1="2" x2="16" y2="6"/^>^<line x1="8" y1="2" x2="8" y2="6"/^>^<line x1="3" y1="10" x2="21" y2="10"/^>^</svg^>) > "icons\calendar.svg"

echo Creating camera.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/^>^<circle cx="12" cy="13" r="4"/^>^</svg^>) > "icons\camera.svg"

echo Creating check.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polyline points="20 6 9 17 4 12"/^>^</svg^>) > "icons\check.svg"

echo Creating chevron-up.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polyline points="18 15 12 9 6 15"/^>^</svg^>) > "icons\chevron-up.svg"

echo Creating clipboard.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/^>^<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/^>^</svg^>) > "icons\clipboard.svg"

echo Creating clock.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<circle cx="12" cy="12" r="10"/^>^<polyline points="12 6 12 12 16 14"/^>^</svg^>) > "icons\clock.svg"

echo Creating code.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polyline points="16 18 22 12 16 6"/^>^<polyline points="8 6 2 12 8 18"/^>^</svg^>) > "icons\code.svg"

echo Creating coffee.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M18 8h1a4 4 0 0 1 0 8h-1"/^>^<path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/^>^<line x1="6" y1="1" x2="6" y2="4"/^>^<line x1="10" y1="1" x2="10" y2="4"/^>^<line x1="14" y1="1" x2="14" y2="4"/^>^</svg^>) > "icons\coffee.svg"

echo Creating command.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/^>^</svg^>) > "icons\command.svg"

echo Creating cpu.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/^>^<rect x="9" y="9" width="6" height="6"/^>^<line x1="9" y1="1" x2="9" y2="4"/^>^<line x1="15" y1="1" x2="15" y2="4"/^>^<line x1="9" y1="20" x2="9" y2="23"/^>^<line x1="15" y1="20" x2="15" y2="23"/^>^<line x1="20" y1="9" x2="23" y2="9"/^>^<line x1="20" y1="14" x2="23" y2="14"/^>^<line x1="1" y1="9" x2="4" y2="9"/^>^<line x1="1" y1="14" x2="4" y2="14"/^>^</svg^>) > "icons\cpu.svg"

echo Creating database.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<ellipse cx="12" cy="5" rx="9" ry="3"/^>^<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/^>^<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/^>^</svg^>) > "icons\database.svg"

echo Creating edit.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/^>^<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/^>^</svg^>) > "icons\edit.svg"

echo Creating external-link.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/^>^<polyline points="15 3 21 3 21 9"/^>^<line x1="10" y1="14" x2="21" y2="3"/^>^</svg^>) > "icons\external-link.svg"

echo Creating eye.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/^>^<circle cx="12" cy="12" r="3"/^>^</svg^>) > "icons\eye.svg"

echo Creating filter.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/^>^</svg^>) > "icons\filter.svg"

echo Creating gift.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polyline points="20 12 20 22 4 22 4 12"/^>^<rect x="2" y="7" width="20" height="5"/^>^<line x1="12" y1="22" x2="12" y2="7"/^>^<path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/^>^<path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/^>^</svg^>) > "icons\gift.svg"

echo Creating globe.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<circle cx="12" cy="12" r="10"/^>^<line x1="2" y1="12" x2="22" y2="12"/^>^<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/^>^</svg^>) > "icons\globe.svg"

echo Creating heart.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/^>^</svg^>) > "icons\heart.svg"

echo Creating help-circle.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<circle cx="12" cy="12" r="10"/^>^<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/^>^<line x1="12" y1="17" x2="12.01" y2="17"/^>^</svg^>) > "icons\help-circle.svg"

echo Creating home.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/^>^<polyline points="9 22 9 12 15 12 15 22"/^>^</svg^>) > "icons\home.svg"

echo Creating image.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/^>^<circle cx="8.5" cy="8.5" r="1.5"/^>^<polyline points="21 15 16 10 5 21"/^>^</svg^>) > "icons\image.svg"

echo Creating info.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<circle cx="12" cy="12" r="10"/^>^<line x1="12" y1="16" x2="12" y2="12"/^>^<line x1="12" y1="8" x2="12.01" y2="8"/^>^</svg^>) > "icons\info.svg"

echo Creating link.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/^>^<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/^>^</svg^>) > "icons\link.svg"

echo Creating loader.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<line x1="12" y1="2" x2="12" y2="6"/^>^<line x1="12" y1="18" x2="12" y2="22"/^>^<line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/^>^<line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/^>^<line x1="2" y1="12" x2="6" y2="12"/^>^<line x1="18" y1="12" x2="22" y2="12"/^>^<line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/^>^<line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/^>^</svg^>) > "icons\loader.svg"

echo Creating lock.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/^>^<path d="M7 11V7a5 5 0 0 1 10 0v4"/^>^</svg^>) > "icons\lock.svg"

echo Creating mail.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/^>^<polyline points="22,6 12,13 2,6"/^>^</svg^>) > "icons\mail.svg"

echo Creating menu.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<line x1="3" y1="12" x2="21" y2="12"/^>^<line x1="3" y1="6" x2="21" y2="6"/^>^<line x1="3" y1="18" x2="21" y2="18"/^>^</svg^>) > "icons\menu.svg"

echo Creating message-square.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/^>^</svg^>) > "icons\message-square.svg"

echo Creating mic.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/^>^<path d="M19 10v2a7 7 0 0 1-14 0v-2"/^>^<line x1="12" y1="19" x2="12" y2="23"/^>^<line x1="8" y1="23" x2="16" y2="23"/^>^</svg^>) > "icons\mic.svg"

echo Creating minus.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"^>^<line x1="3.33" y1="8" x2="12.67" y2="8"/^>^</svg^>) > "icons\minus.svg"

echo Creating more-horizontal.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<circle cx="12" cy="12" r="1"/^>^<circle cx="19" cy="12" r="1"/^>^<circle cx="5" cy="12" r="1"/^>^</svg^>) > "icons\more-horizontal.svg"

echo Creating paperclip.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/^>^</svg^>) > "icons\paperclip.svg"

echo Creating refresh-cw.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polyline points="23 4 23 10 17 10"/^>^<polyline points="1 20 1 14 7 14"/^>^<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/^>^</svg^>) > "icons\refresh-cw.svg"

echo Creating search.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<circle cx="11" cy="11" r="8"/^>^<line x1="21" y1="21" x2="16.65" y2="16.65"/^>^</svg^>) > "icons\search.svg"

echo Creating send.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<line x1="22" y1="2" x2="11" y2="13"/^>^<polygon points="22 2 15 22 11 13 2 9 22 2"/^>^</svg^>) > "icons\send.svg"

echo Creating shield.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/^>^</svg^>) > "icons\shield.svg"

echo Creating sliders.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<line x1="4" y1="21" x2="4" y2="14"/^>^<line x1="4" y1="10" x2="4" y2="3"/^>^<line x1="12" y1="21" x2="12" y2="12"/^>^<line x1="12" y1="8" x2="12" y2="3"/^>^<line x1="20" y1="21" x2="20" y2="16"/^>^<line x1="20" y1="12" x2="20" y2="3"/^>^<line x1="1" y1="14" x2="7" y2="14"/^>^<line x1="9" y1="8" x2="15" y2="8"/^>^<line x1="17" y1="16" x2="23" y2="16"/^>^</svg^>) > "icons\sliders.svg"

echo Creating smile.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<circle cx="12" cy="12" r="10"/^>^<path d="M8 14s1.5 2 4 2 4-2 4-2"/^>^<line x1="9" y1="9" x2="9.01" y2="9"/^>^<line x1="15" y1="9" x2="15.01" y2="9"/^>^</svg^>) > "icons\smile.svg"

echo Creating sparkles.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"^>^<path d="M12 2.69l.94 2.66 2.8.4-2.03 2.1.48 2.9-2.51-1.4-2.51 1.4.48-2.9-2.03-2.1 2.8-.4L12 2.69zm6.5 9.81l-1.88.27-1.36 1.46.32 1.94-1.68-.93-1.68.93.32-1.94-1.36-1.46-1.88-.27 1.36-1.46-.32-1.94 1.68.93 1.68-.93-.32 1.94 1.36 1.46zM5.5 12.5l-1.88.27-1.36 1.46.32 1.94-1.68-.93-1.68.93.32-1.94-1.36-1.46-1.88-.27 1.36-1.46-.32-1.94 1.68.93 1.68-.93-.32 1.94 1.36 1.46z"/^>^</svg^>) > "icons\sparkles.svg"

echo Creating thumbs-up.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/^>^</svg^>) > "icons\thumbs-up.svg"

echo Creating trending-up.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/^>^<polyline points="17 6 23 6 23 12"/^>^</svg^>) > "icons\trending-up.svg"

echo Creating unlock.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/^>^<path d="M7 11V7a5 5 0 0 1 9.9-1"/^>^</svg^>) > "icons\unlock.svg"

echo Creating user.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/^>^<circle cx="12" cy="7" r="4"/^>^</svg^>) > "icons\user.svg"

echo Creating video.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polygon points="23 7 16 12 23 17 23 7"/^>^<rect x="1" y="5" width="15" height="14" rx="2" ry="2"/^>^</svg^>) > "icons\video.svg"

echo Creating volume-2.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/^>^<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/^>^</svg^>) > "icons\volume-2.svg"

echo Creating wind.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/^>^</svg^>) > "icons\wind.svg"

echo Creating x.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<line x1="18" y1="6" x2="6" y2="18"/^>^<line x1="6" y1="6" x2="18" y2="18"/^>^</svg^>) > "icons\x.svg"

echo Creating zap.svg...
(echo ^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"^>^<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/^>^</svg^>) > "icons\zap.svg"

echo.
echo =================================================
echo      All icons created successfully!
echo =================================================
echo.
pause