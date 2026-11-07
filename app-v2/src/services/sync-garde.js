// Decision d'ecriture sync, sans Firebase. Le module sync.js s'en sert :
// rien n'est ecrit (local ni cloud) tant que la lecture cloud du compte
// n'a pas reussi. Correctif de2f75de, conserve.
export function ecritureAutorisee(uid, uidEtat, cloudLu) {
  return uid === uidEtat && cloudLu === true;
}
