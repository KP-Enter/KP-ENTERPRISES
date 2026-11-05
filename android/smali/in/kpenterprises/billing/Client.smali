.class public Lin/kpenterprises/billing/Client;
.super Landroid/webkit/WebViewClient;

.field public act:Lin/kpenterprises/billing/MainActivity;

.method public constructor <init>(Lin/kpenterprises/billing/MainActivity;)V
    .locals 0
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    iput-object p1, p0, Lin/kpenterprises/billing/Client;->act:Lin/kpenterprises/billing/MainActivity;
    return-void
.end method

# Pages of the billing app stay inside; everything else (WhatsApp, phone, email…) opens in the right app
.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Z
    .locals 3
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v0
    invoke-virtual {v0}, Landroid/net/Uri;->getHost()Ljava/lang/String;
    move-result-object v1
    const-string v2, "kp-enter.github.io"
    invoke-virtual {v2, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v1
    if-eqz v1, :external
    const/4 v1, 0x0
    return v1

    :external
    :try_start
    new-instance v1, Landroid/content/Intent;
    const-string v2, "android.intent.action.VIEW"
    invoke-direct {v1, v2, v0}, Landroid/content/Intent;-><init>(Ljava/lang/String;Landroid/net/Uri;)V
    iget-object v2, p0, Lin/kpenterprises/billing/Client;->act:Lin/kpenterprises/billing/MainActivity;
    invoke-virtual {v2, v1}, Landroid/app/Activity;->startActivity(Landroid/content/Intent;)V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :caught
    goto :done
    :caught
    move-exception v1
    :done
    const/4 v1, 0x1
    return v1
.end method

# First open with no internet (before the app is saved on the phone): friendly screen
.method public onReceivedError(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;Landroid/webkit/WebResourceError;)V
    .locals 6
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->isForMainFrame()Z
    move-result v0
    if-eqz v0, :end
    move-object v0, p1
    const/4 v1, 0x0
    const-string v2, "<html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0d1a15;font-family:sans-serif'><div style='background:#faf8f0;border-radius:22px;padding:28px 24px;max-width:320px;text-align:center;color:#4d4f50'><h2 style='margin:0 0 8px;color:#2c302e'>No internet connection</h2><p style='line-height:1.5'>Connect to the internet once to set up KPE Billing on this phone. After that it also works offline.</p><a href='https://kp-enter.github.io/KP-ENTERPRISES/' style='display:inline-block;margin-top:10px;background:#5f9441;color:#fff;padding:12px 26px;border-radius:12px;text-decoration:none;font-weight:bold'>Try again</a></div></body></html>"
    const-string v3, "text/html"
    const-string v4, "utf-8"
    const/4 v5, 0x0
    invoke-virtual/range {v0 .. v5}, Landroid/webkit/WebView;->loadDataWithBaseURL(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    :end
    return-void
.end method
