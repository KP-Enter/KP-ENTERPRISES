.class public Lin/kpenterprises/billing/MainActivity;
.super Landroid/app/Activity;

.field public web:Landroid/webkit/WebView;
.field public fileCb:Landroid/webkit/ValueCallback;

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 5
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lin/kpenterprises/billing/MainActivity;->web:Landroid/webkit/WebView;

    const v1, -0xe3d5dd
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1
    const/4 v2, 0x1
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDatabaseEnabled(Z)V
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V
    invoke-virtual {v1}, Landroid/webkit/WebSettings;->getUserAgentString()Ljava/lang/String;
    move-result-object v2
    const-string v3, " KPEBillingApp/1.0"
    invoke-virtual {v2, v3}, Ljava/lang/String;->concat(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v2
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setUserAgentString(Ljava/lang/String;)V

    new-instance v1, Lin/kpenterprises/billing/Client;
    invoke-direct {v1, p0}, Lin/kpenterprises/billing/Client;-><init>(Lin/kpenterprises/billing/MainActivity;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    new-instance v1, Lin/kpenterprises/billing/Chrome;
    invoke-direct {v1, p0}, Lin/kpenterprises/billing/Chrome;-><init>(Lin/kpenterprises/billing/MainActivity;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    new-instance v1, Lin/kpenterprises/billing/Bridge;
    invoke-direct {v1, p0}, Lin/kpenterprises/billing/Bridge;-><init>(Lin/kpenterprises/billing/MainActivity;)V
    const-string v2, "KPEAndroid"
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-virtual {p0, v0}, Lin/kpenterprises/billing/MainActivity;->setContentView(Landroid/view/View;)V

    if-eqz p1, :load
    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->restoreState(Landroid/os/Bundle;)Landroid/webkit/WebBackForwardList;
    move-result-object v1
    if-nez v1, :done

    :load
    const-string v1, "https://kp-enter.github.io/KP-ENTERPRISES/"
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    :done
    return-void
.end method

.method protected onSaveInstanceState(Landroid/os/Bundle;)V
    .locals 1
    invoke-super {p0, p1}, Landroid/app/Activity;->onSaveInstanceState(Landroid/os/Bundle;)V
    iget-object v0, p0, Lin/kpenterprises/billing/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :end
    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->saveState(Landroid/os/Bundle;)Landroid/webkit/WebBackForwardList;
    :end
    return-void
.end method

.method public onBackPressed()V
    .locals 2
    iget-object v0, p0, Lin/kpenterprises/billing/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :leave
    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z
    move-result v1
    if-eqz v1, :leave
    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V
    return-void
    :leave
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V
    return-void
.end method

.method protected onActivityResult(IILandroid/content/Intent;)V
    .locals 2
    const/16 v0, 0x2a
    if-ne p1, v0, :other
    iget-object v0, p0, Lin/kpenterprises/billing/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    if-eqz v0, :ret
    invoke-static {p2, p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->parseResult(ILandroid/content/Intent;)[Landroid/net/Uri;
    move-result-object v1
    invoke-interface {v0, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    const/4 v1, 0x0
    iput-object v1, p0, Lin/kpenterprises/billing/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    :ret
    return-void
    :other
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V
    return-void
.end method
