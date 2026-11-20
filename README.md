# Panel - czytnik CBZ

Mobilny czytnik CBZ jako instalowalna aplikacja webowa (PWA).

## Funkcje

- Otwiera archiwa CBZ z aplikacji Pliki na iPhonie.
- Rozpakowuje i wy�wietla strony lokalnie w przegl�darce.
- Zmiana stron gestem, przyciskami lub suwakiem.
- Zapami�tuje ostatni� czytan� stron� w tej przegl�darce.
- Dzia�a bez konta u�ytkownika; sam plik komiksu nie jest wysy�any na serwer.

## Instalacja na iPhonie

Po udost�pnieniu aplikacji pod adresem HTTPS otw�rz go w Safari, wybierz **Udost�pnij  Dodaj do ekranu pocz�tkowego**. Potem uruchom Panel, wybierz **Wybierz plik CBZ** i wska� komiks w aplikacji Pliki.

### Wybieranie komiksu z Dysku Google

1. Zainstaluj aplikacj� Google Drive na iPhonie i zaloguj si�.
2. Otw�rz **Pliki  Przegl�daj  Wi�cej ()  Edytuj** i w��cz **Google Drive** w lokalizacjach.
3. W Panelu wybierz plik CBZ. W oknie Plik�w przejd� do **Przegl�daj  Google Drive** i wybierz komiks.

Panel korzysta z systemowego selektora plik�w iPhone'a, wi�c nie potrzebuje osobnego logowania Google ani klucza API. Google Drive musi by� dost�pny w aplikacji Pliki.

Do rozpakowania archiwum aplikacja �aduje bibliotek� JSZip z jsDelivr. Sam plik CBZ i wyodr�bnione strony pozostaj� w przegl�darce na urz�dzeniu.

## Darmowe udost�pnienie przez GitHub Pages

Przygotuj paczk� `Panel-Czytnik-CBZ-GitHub-Pages.zip`, za��� darmowe konto GitHub i utw�rz **publiczne** repozytorium. Wgraj do katalogu g��wnego repozytorium zawarto�� paczki. Nast�pnie otw�rz **Settings  Pages**, wybierz publikacj� z ga��zi `main` i katalogu `/ (root)`. Po publikacji GitHub poda adres HTTPS; otw�rz go w Safari i wybierz **Udost�pnij  Dodaj do ekranu pocz�tkowego**.

Repozytorium b�dzie publiczne, ale zawiera tylko kod czytnika. Nie umieszczaj w nim swoich plik�w CBZ.

## Pliki

- `dist/` - gotowa wersja statyczna.
- `.openai/hosting.json` - konfiguracja publikacji statycznej.

## Bezpo�redni wyb�r CBZ z Google Drive

Przycisk **Otw�rz CBZ z Google Drive** u�ywa Google Picker i wymaga konfiguracji w�asnego projektu Google Cloud. Bez tej konfiguracji nadal mo�na otworzy� plik przez aplikacj� Pliki na iPhonie.

1. W Google Cloud Console utw�rz projekt i w��cz **Google Drive API** oraz **Google Picker API**.
2. Skonfiguruj ekran zgody OAuth. Dla aplikacji w trybie testowym dodaj swoje konto Google jako testera.
3. Utw�rz klucz API i klienta OAuth typu **Aplikacja internetowa**. W dozwolonych �r�d�ach JavaScript klienta OAuth wpisz dok�adny adres witryny, np. `https://cutedhlafk.github.io`.
4. Ogranicz klucz API do Google Picker API oraz Google Drive API, a w ograniczeniach witryny dodaj domen� witryny i `https://docs.google.com/*`.
5. Wklej klucz API, identyfikator klienta OAuth i numer projektu do `drive-config.js` w katalogu publikacji (`github-pages/` albo `dist/`). Numer projektu to liczbowy Project number, nie Project ID.
6. Opublikuj ponownie pliki. Po wybraniu **Otw�rz CBZ z Google Drive** zaloguj si� i wybierz plik `.cbz`.

Czytnik prosi Google tylko o zakres `drive.file`; pobieranie odbywa si� bezpo�rednio na urz�dzeniu u�ytkownika. Nie wklejaj do repozytorium sekretu klienta OAuth ani prywatnego klucza. Klucz API i identyfikator klienta s� widoczne w aplikacji przegl�darkowej, dlatego ogranicz klucz do domen witryny.

