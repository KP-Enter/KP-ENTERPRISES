.class public Lin/kpenterprises/billing/Chrome;
.super Landroid/webkit/WebChromeClient;

.field public act:Lin/kpenterprises/billing/MainActivity;

.method public constructor <init>(Lin/kpenterprises/billing/MainActivity;)V
    .locals 0
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    iput-object p1, p0, Lin/kpenterprises/billing/Chrome;->act:Lin/kpenterprises/billing/MainActivity;
    return-void
.end method

# Photo / file picker (signature and stamp upload)
.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .locals 3
    iget-object v0, p0, Lin/kpenterprises/billing/Chrome;->act:Lin/kpenterprises/billing/MainActivity;
    iget-object v1, v0, Lin/kpenterprises/billing/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    if-eqz v1, :set
    const/4 v2, 0x0
    invoke-interface {v1, v2}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :set
    iput-object p2, v0, Lin/kpenterprises/billing/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    :try_start
    invoke-virtual {p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->createIntent()Landroid/content/Intent;
    move-result-object v1
    const/16 v2, 0x2a
    invoke-virtual {v0, v1, v2}, Landroid/app/Activity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :fail
    const/4 v1, 0x1
    return v1
    :fail
    move-exception v1
    const/4 v2, 0x0
    iput-object v2, v0, Lin/kpenterprises/billing/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    const/4 v1, 0x0
    return v1
.end method
