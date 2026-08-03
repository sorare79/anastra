# ANASTRA AI DESIGN DOCUMENT

Version : 1.0

---

# 1. AMAÇ

Anastra AI'nın temel amacı eldeki ceza puanını azaltmak değildir.

Asıl amacı oyun sonunda takımına en fazla puanı kazandırmaktır.

Ceza kontrolü yalnızca ikinci önceliktir.

AI her kararında şu soruya cevap arar:

> "Bu hamle bana en fazla puanı kazandırıyor mu?"

---

# 2. TEMEL FELSEFE

AI kart seçmez.

AI plan seçer.

Gerçek oyuncular tek tek kart düşünmez.

Önce stratejiyi belirler.

Sonra o stratejiye uygun hamleleri oynar.

Anastra AI da aynı mantıkla çalışacaktır.

---

# 3. AI KARAR AKIŞI

GameState

↓

Table Analysis

↓

Strategy Selection

↓

Goal Planning

↓

Utility Evaluation

↓

Simulation

↓

Engine

↓

Move

---

# 4. OYUN EVRELERİ

## EARLY GAME

Henüz kimse açmamıştır.

Amaç

- İlk açan olmak
- Büyük kartları korumak
- Küçük kartları atmak
- 51'e en hızlı ulaşmak

Öncelik

Tempo

---

## MID GAME

En az bir oyuncu açmıştır.

Artık ilk açan olmanın avantajı azalmıştır.

AI yeniden değerlendirme yapar.

Tempo mu?

Patlama mı?

Tuzak mı?

---

## LATE GAME

Destede az kart kalmıştır.

Oyuncuların eli küçülmüştür.

Artık

- ceza kontrolü
- son puanlar
- rakibi cezaya bırakmak

ön plana çıkar.

---

# 5. STRATEJİLER

## TEMPO

Amaç

İlk açan olmak.

Avantaj

- İlk yerden alma hakkı
- İlk işleme hakkı
- Oyunun temposunu belirlemek

Seçilir

- Hiç kimse açmadıysa
- 51 geçilmişse
- Rakip bitmeye yakınsa

---

## PATLAMA

Amaç

Bekleyip tek turda çok kart açmak.

Avantaj

- Eli hızla küçültmek
- Rakibi yüksek cezaya bırakmak

Seçilir

- İlk açma avantajı kaybedildiyse
- El çok güçlüyse
- Bir tur sonra çok daha iyi açılabilecekse

---

## TUZAK

Amaç

Rakibin yerden çok kart almasına izin vermek.

Doğru anda biterek rakibi cezaya bırakmak.

Seçilir

- Rakip açılmışsa
- Rakibin eli büyüyorsa
- AI'nın eli küçülmüşse

---

# 6. GOAL PLANNER

Goal Planner kart seçmez.

Goal üretir.

Örnek

Open Now

Take Discard

Close Opponent Set

Protect High Cards

Discard Low Card

Goal'lar Utility Engine tarafından puanlanır.

---

# 7. UTILITY ENGINE

Her Goal için Utility hesaplanır.

Örneğin

Open Now

+ Açılış puanı

+ Tempo avantajı

+ Yerden kart alma hakkı

- Elde kalan kart

- Bekleme fırsatı

=

TOTAL

En yüksek Utility seçilir.

---

# 8. SIMULATOR

AI önemli hamleleri doğrudan oynamaz.

Önce Engine üzerinde simüle eder.

Örneğin

♥Q at

↓

Rakip alıyor mu?

↓

Kaç puan kazanıyor?

↓

Eğer rakibe büyük avantaj sağlıyorsa

Bu hamle iptal edilir.

---

# 9. AÇILIŞ STRATEJİSİ

İlk açan olmak çok değerlidir.

Çünkü

- yerden kart alma hakkı kazanılır
- işleme hakkı kazanılır

Ancak

İlk açma avantajı kaybolmuşsa

AI beklemeyi değerlendirmeye başlar.

Beklemek daha fazla puan kazandıracaksa

PATLAMA stratejisi seçilebilir.

---

# 10. KART ATMA STRATEJİSİ

Erken oyun

Küçük kartlar atılır.

Büyük kartlar korunur.

Sebep

- 51'i geçmek kolaylaşır.
- Rakibe büyük kart verilmez.

Orta oyun

Per potansiyeli olmayan kartlar atılır.

Geç oyun

Ceza kontrolü ön plana çıkar.

---

# 11. YERDEN KART ALMA STRATEJİSİ

AI yalnızca zorunlu kartı kullanabiliyor diye yerden kart almaz.

Şunları değerlendirir.

- Kazanılacak puan

- Yeni oluşacak perler

- Rakibe verilecek zarar

- Fazladan alınacak kart riski

- Gelecekte oluşacak per ihtimali

---

# 12. İŞLEME STRATEJİSİ

Öncelik sırası

1

Rakip grubunu kapat

↓

2

Rakip serisinden puan kazan

↓

3

Kendi perini büyüt

↓

4

Yeni per oluştur

---

# 13. AI KARARLARI AÇIKLANABİLİR OLACAKTIR

Her kararın nedeni kayıt altına alınacaktır.

Örnek

Strategy

PATLAMA

Reason

Tempo advantage lost.

Future Opening

82

Current Opening

56

Confidence

89%

---

# 14. ÖĞRENEN AI

İlk sürümde AI öğrenmeyecektir.

İlerleyen sürümlerde

- hangi stratejinin daha başarılı olduğu
- hangi oyuncuya karşı hangi stratejinin çalıştığı
- hangi Utility değerlerinin daha doğru sonuç verdiği

kaydedilecektir.

---

# 15. TEMEL PRENSİP

Anastra AI

kart seçmez.

Plan seçer.

Her planın Utility değeri hesaplanır.

En yüksek Utility değerine sahip plan uygulanır.