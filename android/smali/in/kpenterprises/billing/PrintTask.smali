.class public Lin/kpenterprises/billing/PrintTask;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;

.field public act:Lin/kpenterprises/billing/MainActivity;
.field public title:Ljava/lang/String;

.method public constructor <init>(Lin/kpenterprises/billing/MainActivity;Ljava/lang/String;)V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lin/kpenterprises/billing/PrintTask;->act:Lin/kpenterprises/billing/MainActivity;
    iput-object p2, p0, Lin/kpenterprises/billing/PrintTask;->title:Ljava/lang/String;
    return-void
.end method

.method public run()V
    .locals 4
    :try_start
    iget-object v0, p0, Lin/kpenterprises/billing/PrintTask;->act:Lin/kpenterprises/billing/MainActivity;
    const-string v1, "print"
    invoke-virtual {v0, v1}, Landroid/app/Activity;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;
    move-result-object v1
    check-cast v1, Landroid/print/PrintManager;
    iget-object v2, v0, Lin/kpenterprises/billing/MainActivity;->web:Landroid/webkit/WebView;
    iget-object v3, p0, Lin/kpenterprises/billing/PrintTask;->title:Ljava/lang/String;
    invoke-virtual {v2, v3}, Landroid/webkit/WebView;->createPrintDocumentAdapter(Ljava/lang/String;)Landroid/print/PrintDocumentAdapter;
    move-result-object v2
    const/4 v0, 0x0
    invoke-virtual {v1, v3, v2, v0}, Landroid/print/PrintManager;->print(Ljava/lang/String;Landroid/print/PrintDocumentAdapter;Landroid/print/PrintAttributes;)Landroid/print/PrintJob;
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :err
    return-void
    :err
    move-exception v0
    return-void
.end method
