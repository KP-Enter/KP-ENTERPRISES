.class public Lin/kpenterprises/billing/Done;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;

.field public act:Lin/kpenterprises/billing/MainActivity;
.field public uri:Landroid/net/Uri;
.field public msg:Ljava/lang/String;
.field public share:Z

.method public constructor <init>(Lin/kpenterprises/billing/MainActivity;Landroid/net/Uri;Ljava/lang/String;Z)V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lin/kpenterprises/billing/Done;->act:Lin/kpenterprises/billing/MainActivity;
    iput-object p2, p0, Lin/kpenterprises/billing/Done;->uri:Landroid/net/Uri;
    iput-object p3, p0, Lin/kpenterprises/billing/Done;->msg:Ljava/lang/String;
    iput-boolean p4, p0, Lin/kpenterprises/billing/Done;->share:Z
    return-void
.end method

.method public run()V
    .locals 5
    iget-object v0, p0, Lin/kpenterprises/billing/Done;->act:Lin/kpenterprises/billing/MainActivity;
    iget-object v1, p0, Lin/kpenterprises/billing/Done;->msg:Ljava/lang/String;
    const/4 v2, 0x1
    invoke-static {v0, v1, v2}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;
    move-result-object v1
    invoke-virtual {v1}, Landroid/widget/Toast;->show()V
    iget-object v1, p0, Lin/kpenterprises/billing/Done;->uri:Landroid/net/Uri;
    if-eqz v1, :ret

    :try_start
    iget-boolean v2, p0, Lin/kpenterprises/billing/Done;->share:Z
    if-eqz v2, :view
    new-instance v3, Landroid/content/Intent;
    const-string v4, "android.intent.action.SEND"
    invoke-direct {v3, v4}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
    const-string v4, "application/pdf"
    invoke-virtual {v3, v4}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;
    const-string v4, "android.intent.extra.STREAM"
    invoke-virtual {v3, v4, v1}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Landroid/os/Parcelable;)Landroid/content/Intent;
    const/4 v4, 0x1
    invoke-virtual {v3, v4}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;
    const-string v4, "Share bill"
    invoke-static {v3, v4}, Landroid/content/Intent;->createChooser(Landroid/content/Intent;Ljava/lang/CharSequence;)Landroid/content/Intent;
    move-result-object v3
    goto :go
    :view
    new-instance v3, Landroid/content/Intent;
    const-string v4, "android.intent.action.VIEW"
    invoke-direct {v3, v4}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
    const-string v4, "application/pdf"
    invoke-virtual {v3, v1, v4}, Landroid/content/Intent;->setDataAndType(Landroid/net/Uri;Ljava/lang/String;)Landroid/content/Intent;
    const/4 v4, 0x1
    invoke-virtual {v3, v4}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;
    :go
    invoke-virtual {v0, v3}, Landroid/app/Activity;->startActivity(Landroid/content/Intent;)V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :err
    :ret
    return-void
    :err
    move-exception v0
    return-void
.end method
