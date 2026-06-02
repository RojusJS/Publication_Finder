import os
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from openai import OpenAI

from apps.projects.models import Project, SavedPublication
from apps.projects.api.views import get_accessible_project

BASE_INSTRUCTIONS = """Rašyk akademiniu, bet suprantamu stiliumi. Būk konkretus ir remkis pateiktais duomenimis.
Jei publikacijų santraukos nepateiktos, analizuok pagal pavadinimus.
Nenaudok jokio markdown formatavimo — jokių ### antraščių, jokių ** paryškinimų, jokių brūkšnelių sąrašų.
Rašyk grynu tekstu, skirstyk į pastraipas naudodamas tuščias eilutes tarp skyrių.
Kiekvieno skyriaus pradžioje parašyk jo pavadinimą kaip paprastą tekstą, po to dvitaškį."""

FOCUS_PROMPTS = {
    "bendros": f"""Esi mokslinis tyrėjų asistentas, specializuojantis akademinių publikacijų analizėje.
Tavo užduotis — išanalizuoti vartotojo pateiktą akademinių publikacijų sąrašą ir pateikti išsamias, \
struktūrizuotas įžvalgas lietuvių kalba.

Analizuodamas publikacijas, aptark šiuos aspektus:
1. Pagrindinės temos ir kryptys — kokie pagrindiniai moksliniai klausimai nagrinėjami šiame sąraše?
2. Chronologinė raida — kaip kito tyrimų kryptys laikui bėgant?
3. Metodologiniai požiūriai — kokius tyrimo metodus dažniausiai naudoja autoriai?
4. Ryšiai tarp publikacijų — kaip publikacijos papildo viena kitą arba prieštarauja?
5. Mokslinės spragos — ko trūksta šiame sąraše, kokie klausimai lieka neatsakyti?
6. Bendros išvados — kokią bendrą mokslinę vertę turi šis publikacijų sąrašas?
7. Kokias panašias publikacijas siūlytum ieškoti, kurios atitktų tematiką, bet nebūtų visiškai tokios pačios?

{BASE_INSTRUCTIONS}""",

    "temos": f"""Esi mokslinis tyrėjų asistentas, specializuojantis akademinių publikacijų analizėje.
Tavo užduotis — atlikti išsamią teminę analizę pateikto publikacijų sąrašo lietuvių kalba.

Sutelk dėmesį į šiuos aspektus:
1. Pagrindinės temos ir kryptys — aptark kiekvieną temą atskirai, nurodyk konkrečias publikacijas, kurios ją nagrinėja
2. Tematiniai ryšiai — kaip temos siejasi tarpusavyje, kokios sąsajos tarp krypčių
3. Temų raida laikui bėgant — ar temos keitėsi, ar atsirado naujų tematikų vėlesnėse publikacijose
4. Dominuojančios ir marginalinės temos — kurioms temoms skiriama daugiausiai dėmesio, kokios lieka mažiau pastebimos
5. Rekomenduojamos paieškos kryptys — kokia tematika verta ieškoti papildomų šaltinių

Kiekvieną aspektą aptark išsamiai, cituok autorius ir metus, pateik konkrečius pavyzdžius.

{BASE_INSTRUCTIONS}""",

    "metodologija": f"""Esi mokslinis tyrėjų asistentas, specializuojantis akademinių publikacijų analizėje.
Tavo užduotis — atlikti išsamią metodologinę analizę pateikto publikacijų sąrašo lietuvių kalba.

Sutelk dėmesį išskirtinai į šiuos aspektus:
1. Naudojami tyrimo metodai — aptark kiekvienos publikacijos metodologinį požiūrį atskirai
2. Kiekybiniai ir kokybiniai metodai — kaip jie pasiskirsto sąraše, kurie dominuoja
3. Metodologiniai stiprumai — kokie metodai atrodo labiausiai pagrįsti ir tinkami
4. Metodologiniai trūkumai — kokių metodologinių aspektų trūksta, kas galėtų būti geriau
5. Metodologijų palyginimas — kaip skirtingų autorių metodologiniai pasirinkimai skiriasi ir kodėl
6. Rekomendacijos — kokius metodus verta naudoti tolesniam tyrimui šia tematika

Kiekvieną aspektą aptark išsamiai, cituok autorius ir metus, pateik konkrečius pavyzdžius.

{BASE_INSTRUCTIONS}""",

    "spragos": f"""Esi mokslinis tyrėjų asistentas, specializuojantis akademinių publikacijų analizėje.
Tavo užduotis — atlikti išsamią mokslinių spragų analizę pateikto publikacijų sąrašo lietuvių kalba.

Sutelk dėmesį išskirtinai į šiuos aspektus:
1. Teminės spragos — kokios svarbios temos nepakankamiai nagrinėjamos arba visai nenagrinėjamos
2. Metodologinės spragos — kokių tyrimo metodų ar požiūrių trūksta
3. Geografinės ir kultūrinės spragos — ar tyrimai apima tik tam tikrus regionus ar kultūras
4. Chronologinės spragos — kokie laikotarpiai ar raidos etapai nepakankamiai aprašyti
5. Praktinio taikymo spragos — ar yra ryšys tarp teorijos ir jos taikymo praktikoje?
6. Ateities tyrimų rekomendacijos — kokius klausimus būtų labiausiai verta tirti toliau ir kodėl

Kiekvieną aspektą aptark išsamiai, cituok autorius ir metus, pateik konkrečius pavyzdžius.

{BASE_INSTRUCTIONS}""",
}


def build_user_prompt(publications: list[dict]) -> str:
    lines = [f"Pateikiu {len(publications)} akademinių publikacijų sąrašą analizei:\n"]
    for i, pub in enumerate(publications, 1):
        lines.append(f"[{i}] Pavadinimas: {pub['title']}")
        if pub.get("year"):
            lines.append(f"    Metai: {pub['year']}")
        if pub.get("authors"):
            authors = ", ".join(pub["authors"][:4])
            if len(pub["authors"]) > 4:
                authors += " ir kt."
            lines.append(f"    Autoriai: {authors}")
        if pub.get("abstract"):
            abstract = pub["abstract"][:600]
            if len(pub["abstract"]) > 600:
                abstract += "..."
            lines.append(f"    Santrauka: {abstract}")
        if pub.get("keywords"):
            lines.append(f"    Raktažodžiai: {', '.join(pub['keywords'][:6])}")
        lines.append("")
    lines.append("Pateik išsamią mokslinę analizę remiantis šiuo publikacijų sąrašu.")
    return "\n".join(lines)


class ProjectInsightsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_accessible_project(request.user, project_id)
        publications = SavedPublication.objects.filter(project=project)
        if not publications.exists():
            return JsonResponse({"error": "Projekte nėra publikacijų analizei"}, status=400)
        focus = request.data.get("focus", "bendros")
        if focus not in FOCUS_PROMPTS:
            focus = "bendros"
        pub_data = [
            {
                "title": pub.title,
                "year": pub.year,
                "authors": pub.authors or [],
                "abstract": pub.abstract or "",
                "keywords": [k if isinstance(k, str) else k.get("display_name", "") for k in (pub.keywords or [])],
            }
            for pub in publications
        ]
        user_prompt = build_user_prompt(pub_data)
        system_prompt = FOCUS_PROMPTS[focus]
        try:
            client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.5,
                max_tokens=2000,
            )
            text = response.choices[0].message.content
            return Response({"insights": text})
        except Exception as e:
            return JsonResponse({"error": f"Įžvalgų generavimas nepavyko: {str(e)}"}, status=502)