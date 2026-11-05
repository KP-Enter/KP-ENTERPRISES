.class public Lin/kpenterprises/billing/Bridge;
.super Ljava/lang/Object;

.field public act:Lin/kpenterprises/billing/MainActivity;

.method public constructor <init>(Lin/kpenterprises/billing/MainActivity;)V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lin/kpenterprises/billing/Bridge;->act:Lin/kpenterprises/billing/MainActivity;
    return-void
.end method

# KPEAndroid.print(title) — Android print screen (printer or "Save as PDF")
.method public print(Ljava/lang/String;)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    iget-object v0, p0, Lin/kpenterprises/billing/Bridge;->act:Lin/kpenterprises/billing/MainActivity;
    new-instance v1, Lin/kpenterprises/billing/PrintTask;
    invoke-direct {v1, v0, p1}, Lin/kpenterprises/billing/PrintTask;-><init>(Lin/kpenterprises/billing/MainActivity;Ljava/lang/String;)V
    invoke-virtual {v0, v1}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V
    return-void
.end method

# KPEAndroid.savePdf(base64, fileName, share) — saves to Downloads/KPE Bills, then opens or shares it
.method public savePdf(Ljava/lang/String;Ljava/lang/String;Z)V
    .locals 8
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    iget-object v0, p0, Lin/kpenterprises/billing/Bridge;->act:Lin/kpenterprises/billing/MainActivity;
    const/4 v7, 0x0
    const-string v5, ""
    :try_start
    const/4 v1, 0x0
    invoke-static {p1, v1}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B
    move-result-object v1
    sget v2, Landroid/os/Build$VERSION;->SDK_INT:I
    const/16 v3, 0x1d
    if-lt v2, v3, :old

    new-instance v2, Landroid/content/ContentValues;
    invoke-direct {v2}, Landroid/content/ContentValues;-><init>()V
    const-string v3, "_display_name"
    invoke-virtual {v2, v3, p2}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V
    const-string v3, "mime_type"
    const-string v4, "application/pdf"
    invoke-virtual {v2, v3, v4}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V
    const-string v3, "relative_path"
    const-string v4, "Download/KPE Bills"
    invoke-virtual {v2, v3, v4}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V
    invoke-virtual {v0}, Landroid/app/Activity;->getContentResolver()Landroid/content/ContentResolver;
    move-result-object v3
    sget-object v4, Landroid/provider/MediaStore$Downloads;->EXTERNAL_CONTENT_URI:Landroid/net/Uri;
    invoke-virtual {v3, v4, v2}, Landroid/content/ContentResolver;->insert(Landroid/net/Uri;Landroid/content/ContentValues;)Landroid/net/Uri;
    move-result-object v7
    invoke-virtual {v3, v7}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;
    move-result-object v4
    invoke-virtual {v4, v1}, Ljava/io/OutputStream;->write([B)V
    invoke-virtual {v4}, Ljava/io/OutputStream;->close()V
    const-string v5, "Bill saved in Downloads/KPE Bills"
    goto :saved

    :old
    sget-object v2, Landroid/os/Environment;->DIRECTORY_DOWNLOADS:Ljava/lang/String;
    invoke-virtual {v0, v2}, Landroid/app/Activity;->getExternalFilesDir(Ljava/lang/String;)Ljava/io/File;
    move-result-object v2
    new-instance v3, Ljava/io/File;
    invoke-direct {v3, v2, p2}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V
    new-instance v4, Ljava/io/FileOutputStream;
    invoke-direct {v4, v3}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V
    invoke-virtual {v4, v1}, Ljava/io/FileOutputStream;->write([B)V
    invoke-virtual {v4}, Ljava/io/FileOutputStream;->close()V
    invoke-virtual {v3}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;
    move-result-object v5
    const-string v6, "Bill saved: "
    invoke-virtual {v6, v5}, Ljava/lang/String;->concat(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v5

    :saved
    nop
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :err

    new-instance v6, Lin/kpenterprises/billing/Done;
    invoke-direct {v6, v0, v7, v5, p3}, Lin/kpenterprises/billing/Done;-><init>(Lin/kpenterprises/billing/MainActivity;Landroid/net/Uri;Ljava/lang/String;Z)V
    invoke-virtual {v0, v6}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V
    return-void

    :err
    move-exception v1
    const/4 v7, 0x0
    const-string v5, "Could not save the PDF. Please try again."
    new-instance v6, Lin/kpenterprises/billing/Done;
    invoke-direct {v6, v0, v7, v5, p3}, Lin/kpenterprises/billing/Done;-><init>(Lin/kpenterprises/billing/MainActivity;Landroid/net/Uri;Ljava/lang/String;Z)V
    invoke-virtual {v0, v6}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V
    return-void
.end method
