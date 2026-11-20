// Legacy VisaStay link target. Forwards only a PKCE ?code= (useless without
// the verifier on the requesting phone); never anything from the URL hash.
(function () {
  var code = new URLSearchParams(location.search).get('code');
  var url = 'com.digitalnomadessentials.digital_nomad_essentials://login-callback';
  if (code && /^[A-Za-z0-9_-]{8,256}$/.test(code)) url += '?code=' + encodeURIComponent(code);
  location.replace(url);
})();
