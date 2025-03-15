{pkgs}: {
  deps = [
    pkgs.postgresql
    pkgs.fontconfig
    pkgs.nss
    pkgs.glib
    pkgs.chromium
  ];
}
